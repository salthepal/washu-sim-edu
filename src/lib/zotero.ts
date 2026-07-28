import type { CollectionEntry } from 'astro:content';

export function formatCitationHtml(bibHtml: string): string {
  return bibHtml
    .replace(
      /<div\b[^>]*class=(["'])csl-left-margin\1[^>]*>[\s\S]*?<\/div>/gi,
      '',
    )
    .replace(
      /<div\b[^>]*class=(["'])csl-(?:bib-body|entry|right-inline)\1[^>]*>/gi,
      '',
    )
    .replace(/<\/div>/gi, '')
    .trim();
}

export function sortBibliography(
  items: CollectionEntry<'bibliography'>[],
): CollectionEntry<'bibliography'>[] {
  return items.sort((a, b) => {
    const byCreator = (a.data.creators ?? '').localeCompare(b.data.creators ?? '');
    return byCreator || a.data.title.localeCompare(b.data.title);
  });
}
