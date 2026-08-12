# WUEM Sim Edu

The online curriculum for the simulation component of WashU Emergency
Medicine's residency Education Rotation. Residents move through a focused set
of modules, use annotated cases and curated readings as references, and leave
with a simulation case ready to run.

The current learning experience includes:

- Four core modules covering objectives and educational design, scenario
  writing, case operations, and prebriefing and debriefing.
- Additional modules on simulation technology, difficult learner encounters,
  and simulation research.
- Structured reflection prompts whose latest responses are saved anonymously
  and available to faculty as a CSV export.
- Annotated emergency medicine case exemplars with attributed, downloadable
  facilitator packets.
- A curated document library and module-specific, Zotero-backed reading lists.

Built with **Astro** content collections and deployed as a full-stack
Cloudflare Worker at `https://edu.wuemsim.org`. The public `workers.dev`
route is disabled; production traffic uses the public custom domain.

## Architecture at a glance

- **Content is data.** Sim cases and modules are MDX with strict Zod schemas
  (`src/content.config.ts`); a malformed contribution fails the build instead of
  shipping. The document library is one YAML file.
- **Bibliography is pulled at build time** from a Zotero *group* library via a
  custom Content Layer loader (`src/loaders/zotero.ts`). Zotero renders the
  citations server-side in AMA style, so there's no citation engine in the bundle.
- **Learners do not need an account.** The response API assigns each browser a
  random, pseudonymous identifier in an HttpOnly cookie; it does not collect an
  email address.
- **Learner work is saved in D1.** Each learner has one current response per
  module prompt; submitting again updates that response.
- **Case packets stay private in R2.** Downloads pass through the Worker instead
  of being published as static assets.

## Curriculum

The required sequence is designed around the resident's working case:

1. **Learning Objectives and Educational Design** — define the gap, learner,
   objective, and assessment.
2. **Case Writing and Scenario Design** — turn that objective into a coherent,
   runnable scenario.
3. **Running the Case** — select an appropriate modality and technology, then
   prepare the people, environment, operating plan, and contingencies needed
   for reliable facilitation.
4. **Prebriefing and Debriefing** — establish psychological safety and plan a
   discussion tied to observed performance.

Difficult Learners and Simulation Research extend the core sequence. Technology
selection, manikin operating models, virtual and game-based simulation, failure
planning, and evaluation are integrated into Running the Case.

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # Worker output to ./dist
npm run preview    # build and run with Wrangler
npm run check      # type + content schema check
```

The bibliography is empty until you set `ZOTERO_GROUP_ID` (see `.env.example`).
Everything else runs out of the box.

## Content model

| Collection | Location | Notes |
|------------|----------|-------|
| `simCases` | `src/content/sim-cases/*.mdx` | The exemplar library. |
| `modules` | `src/content/modules/*.mdx` | Ordered simulation curriculum; can reference cases and Zotero tags. |
| `documents` | `src/content/documents.yaml` | Curated, tagged link library. |
| `bibliography` | Zotero API | Tag items by module; reading lists assemble themselves. |

Required fields per type live in `src/content.config.ts`. The contribution
standard is `docs/sim-case-rubric.md`.

## Case file storage

Downloadable case packets are stored in Cloudflare R2, not in `public/`.
The production bucket is `washu-sim-edu-case-files`, bound to the Worker as
`CASE_FILES` in `wrangler.jsonc`.

Use object keys under the `cases/` prefix:

```bash
npx wrangler r2 object put washu-sim-edu-case-files/cases/example-case.docx \
  --file ./example-case.docx \
  --remote
```

The site serves those private R2 objects through the Worker route
`/downloads/cases/<filename>`. Case frontmatter and `documents.yaml` should link
to that route, for example:

```yaml
attachments:
  - label: Example source case DOCX
    href: /downloads/cases/example-case.docx
```

This keeps the external URL stable at `https://edu.wuemsim.org/downloads/cases/...`
while letting the object storage scale independently from site deploys. The R2
bucket should remain private; the Worker route sits behind the same Cloudflare
Access protection as the rest of the site.

## Deploy to Cloudflare Workers

```bash
npm run check
npm run build
npm run deploy
```

The Worker serves both prerendered content and API routes. Static assets are
deployed from Astro's generated `dist/client` output, while server code runs via
the Cloudflare adapter entrypoint.

The legacy Cloudflare Pages project at `https://washu-sim-edu.pages.dev` is not
the production target for module responses. Use `https://edu.wuemsim.org` for
the D1-backed Worker API routes.

Security headers are served from `public/_headers`.

## Module responses

Modules can include structured free-text prompts in frontmatter under
`responsePrompts`. Learners submit responses from the module page without
signing in. The API saves one latest response per anonymous browser, module, and
prompt in Cloudflare D1. Faculty review is available through the optional
Cloudflare Access-protected CSV export at `/api/responses/export.csv`.

Current production resources:

- D1 database: `washu-sim-edu-responses`
- D1 database ID: `e0d582c3-5b5b-4314-be31-e64033244091`
- Worker binding: `DB`
- CSV faculty allowlist: `sphadnisuf@gmail.com`

If rebuilding this setup from scratch:

1. Create a D1 database, for example:
   ```bash
   npx wrangler d1 create washu-sim-edu-responses
   ```
2. Replace the D1 `database_id` in `wrangler.jsonc` with the returned database
   id.
3. Apply the migration:
   ```bash
   npx wrangler d1 migrations apply washu-sim-edu-responses --remote
   ```
4. To enable the optional faculty CSV export, protect that route with
   Cloudflare Access and set these values in `wrangler.jsonc` or the Worker
   dashboard:
   - `TEAM_DOMAIN`: your Access team domain, e.g. `https://team.cloudflareaccess.com`
   - `POLICY_AUD`: this Access application's audience tag
   - `FACULTY_EMAILS`: comma-separated faculty emails allowed to export CSVs

For local API testing, Wrangler uses local D1 state:

```bash
npx wrangler d1 migrations apply washu-sim-edu-responses --local
npm run build
npx wrangler dev --local
```

## Access control

The curriculum and learner response endpoint are public. Learner submissions
are associated with a random browser cookie instead of an identity or email
address. Clearing site data or using another browser creates a new anonymous
learner identifier.

The faculty CSV export remains coded to require Cloudflare Access and the
`FACULTY_EMAILS` allowlist. It is unavailable unless a path-specific Access
application is configured for `/api/responses/export.csv`.

### Configure the optional faculty export

1. Add the Worker to a custom domain (Access policies attach to a
   hostname, e.g. `sim.your-domain.org`).
2. Dashboard → **Zero Trust → Access → Applications → Add an application →
   Self-hosted**.
3. Application domain: `edu.wuemsim.org/api/responses/export.csv`.
4. Add a policy:
   - Action: **Allow**
   - Rule: **Emails** → add the faculty addresses allowed to export responses.
5. Pick a login method (One-time PIN works with no IdP setup — users get an
   email code).
6. Copy the application's audience tag to `POLICY_AUD`, keep `TEAM_DOMAIN` set
   to the Access team domain, and save. Only the faculty export prompts for
   Access login; the rest of EDU remains public.

## Contribution flow

1. Resident starts from the standard case template and adds an MDX file under
   `src/content/sim-cases/`.
2. Open a PR (the template prompts the rubric self-check). The build validates
   the schema; a preview deploy renders the case.
3. Faculty review against `docs/sim-case-rubric.md`, then merge the case when it
   meets the standard.

`CODEOWNERS` routes content changes to sim faculty for review. Replace the
placeholder handles before going live.
