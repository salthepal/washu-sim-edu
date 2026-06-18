import type { Loader } from 'astro/loaders';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let localEnv: Record<string, string> | undefined;

function getBuildEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];

  if (!localEnv) {
    localEnv = {};
    const envPath = resolve(process.cwd(), '.env');

    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (!match) continue;

        const [, key, rawValue = ''] = match;
        localEnv[key] = rawValue.replace(/^['"]|['"]$/g, '');
      }
    }
  }

  return localEnv[name];
}

function slugifyTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferLocalTags(item: { title?: string; abstractNote?: string; tags?: string[] }): string[] {
  const haystack = [item.title, item.abstractNote, ...(item.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const tags = new Set<string>();

  if (haystack.includes('debrief')) tags.add('debriefing');
  if (haystack.includes('advocacy') && haystack.includes('inquiry')) {
    tags.add('advocacy-inquiry');
  }
  if (haystack.includes('psychological safety')) tags.add('psychological-safety');
  if (haystack.includes('learning objective')) tags.add('learning-objectives');

  return [...tags];
}

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
  const STYLE = getBuildEnv('ZOTERO_STYLE') ?? 'american-medical-association';

  return {
    name: 'zotero',
    async load({ store, logger, parseData, generateDigest }) {
      const groupId = getBuildEnv('ZOTERO_GROUP_ID');
      const apiKey = getBuildEnv('ZOTERO_API_KEY');

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

            const zoteroTags = (d.tags ?? [])
              .map((t: any) => t.tag)
              .filter(Boolean)
              .map(slugifyTag)
              .filter(Boolean);
            const tags = [
              ...new Set([
                ...zoteroTags,
                ...inferLocalTags({
                  title: d.title,
                  abstractNote: d.abstractNote,
                  tags: zoteroTags,
                }),
              ]),
            ];

            const raw = {
              key: item.key,
              itemType: d.itemType ?? 'unknown',
              title: d.title ?? '(untitled)',
              creators: creators || undefined,
              date: d.date || undefined,
              url: d.url || undefined,
              doi: d.DOI || undefined,
              tags,
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
