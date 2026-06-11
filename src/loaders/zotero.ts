import type { Loader } from 'astro/loaders';

/**
 * Zotero Content Layer loader.
 *
 * Pulls a Zotero GROUP library at build time and stores each item with a
 * pre-formatted citation (rendered by Zotero in the configured CSL style).
 * Letting Zotero render citations server-side means we don't ship citation-js
 * or any CSL engine in the bundle.
 *
 * Configure via Cloudflare Pages build environment variables:
 *   ZOTERO_GROUP_ID   numeric group library id          (required to load anything)
 *   ZOTERO_API_KEY    read key for a private group       (omit for a public group)
 *   ZOTERO_STYLE      CSL style slug, default below      (e.g. american-medical-association)
 *
 * If ZOTERO_GROUP_ID is unset the loader no-ops and the build still succeeds,
 * so a fresh clone runs out of the box before any secrets are wired up.
 */
export function zoteroLoader(): Loader {
  const PAGE_SIZE = 100;
  const STYLE = process.env.ZOTERO_STYLE ?? 'american-medical-association';

  return {
    name: 'zotero',
    async load({ store, logger, parseData, generateDigest }) {
      const groupId = process.env.ZOTERO_GROUP_ID;
      const apiKey = process.env.ZOTERO_API_KEY;

      store.clear();

      if (!groupId) {
        logger.warn(
          'ZOTERO_GROUP_ID not set — bibliography collection will be empty. ' +
            'Set it in Cloudflare Pages build env to populate the reading lists.',
        );
        return;
      }

      const base = `https://api.zotero.org/groups/${groupId}/items`;
      const headers: Record<string, string> = { 'Zotero-API-Version': '3' };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      let start = 0;
      let total = Infinity;
      let fetched = 0;

      try {
        while (start < total) {
          const url =
            `${base}?format=json&include=data,bib` +
            `&style=${encodeURIComponent(STYLE)}` +
            `&itemType=-attachment%20||%20note` +
            `&limit=${PAGE_SIZE}&start=${start}`;

          const res = await fetch(url, { headers });
          if (!res.ok) {
            logger.error(`Zotero API ${res.status} ${res.statusText} — skipping bibliography.`);
            return;
          }

          const totalHeader = res.headers.get('Total-Results');
          if (totalHeader) total = parseInt(totalHeader, 10);

          const items: any[] = await res.json();
          if (items.length === 0) break;

          for (const item of items) {
            const d = item.data ?? {};
            const creators = (d.creators ?? [])
              .map((c: any) => c.lastName ?? c.name ?? '')
              .filter(Boolean)
              .join(', ');

            const raw = {
              key: item.key,
              itemType: d.itemType ?? 'unknown',
              title: d.title ?? '(untitled)',
              creators: creators || undefined,
              date: d.date || undefined,
              url: d.url || undefined,
              doi: d.DOI || undefined,
              tags: (d.tags ?? []).map((t: any) => t.tag).filter(Boolean),
              bibHtml: item.bib ?? '',
            };

            const data = await parseData({ id: item.key, data: raw });
            const digest = generateDigest(data);
            store.set({ id: item.key, data, digest });
            fetched++;
          }

          start += PAGE_SIZE;
        }

        logger.info(`Loaded ${fetched} Zotero items (style: ${STYLE}).`);
      } catch (err) {
        logger.error(`Zotero load failed: ${(err as Error).message} — bibliography left empty.`);
      }
    },
  };
}
