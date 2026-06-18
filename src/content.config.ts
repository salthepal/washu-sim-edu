import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { zoteroLoader } from './loaders/zotero';

/**
 * Sim case exemplars — the centerpiece of the library.
 *
 * The schema is deliberately strict: a contributor's PR will FAIL the build
 * if a required field is missing or an enum value is wrong. That is how the
 * exemplar library stays consistent across dozens of resident-authored cases
 * without anyone hand-policing it.
 */
const simCases = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/sim-cases' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    year: z.number().int().gte(2000).lte(2100),
    modality: z.enum([
      'high-fidelity',
      'standardized-patient',
      'task-trainer',
      'hybrid',
      'in-situ',
      'screen-based',
    ]),
    targetLearners: z
      .array(z.enum(['PGY1', 'PGY2', 'PGY3', 'PGY4', 'faculty', 'medical-student']))
      .min(1),
    chiefComplaint: z.string().optional(),
    objectives: z.array(z.string()).min(1),
    // ACGME EM milestone IDs, e.g. "PC2", "ICS1" — kept as free strings so the
    // list can track milestone revisions without a schema change.
    milestones: z.array(z.string()).default([]),
    duration: z.number().int().positive().optional(), // minutes
    // The single most important field: why is THIS a teaching exemplar?
    annotation: z.string(),
    status: z.enum(['draft', 'in-review', 'peer-reviewed', 'archived']).default('draft'),
    // True when the case body uses <Note> components and has a dissection view.
    anatomy: z.boolean().default(false),
    // Cross-links the case to its reading list (matches Zotero item tags).
    zoteroTags: z.array(z.string()).default([]),
    // Optional supporting files hosted in R2 / linked out (not committed to git).
    attachments: z
      .array(z.object({ label: z.string(), href: z.string().url() }))
      .default([]),
  }),
});

/**
 * Curriculum modules — the structured learning path. Each module can reference
 * exemplar cases by id and pull its own reading list via Zotero tags.
 */
const modules = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/modules' }),
  schema: z.object({
    title: z.string(),
    order: z.number().int(),
    category: z.enum(['core', 'additional']).default('core'),
    summary: z.string(),
    objectives: z.array(z.string()).default([]),
    responsePrompts: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          title: z.string(),
          prompt: z.string(),
          required: z.boolean().default(true),
        }),
      )
      .default([]),
    caseRefs: z.array(reference('simCases')).default([]),
    zoteroTags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

/**
 * Curated document library — a single YAML file of tagged links. We link to
 * institutionally-licensed copies rather than re-hosting copyrighted material.
 */
const documents = defineCollection({
  loader: file('./src/content/documents.yaml'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    href: z.string().url(),
    kind: z.enum(['guideline', 'template', 'tool', 'reference', 'video', 'library-link']),
    source: z.string().optional(),
    note: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

/**
 * Bibliography — populated at build time from a Zotero GROUP library via the
 * Zotero Web API. Citations are rendered server-side by Zotero in the
 * configured CSL style (default: AMA), so we ship no citation-rendering deps.
 * Builds succeed even with no API credentials (the collection is just empty).
 */
const bibliography = defineCollection({
  loader: zoteroLoader(),
  schema: z.object({
    key: z.string(),
    itemType: z.string(),
    title: z.string(),
    creators: z.string().optional(),
    date: z.string().optional(),
    url: z.string().optional(),
    doi: z.string().optional(),
    tags: z.array(z.string()).default([]),
    bibHtml: z.string(), // pre-formatted citation HTML from Zotero
  }),
});

export const collections = { simCases, modules, documents, bibliography };
