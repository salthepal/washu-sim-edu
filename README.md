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
- Structured reflection prompts whose latest responses are saved for residents
  and available to faculty as a CSV export.
- Annotated emergency medicine case exemplars with attributed, downloadable
  facilitator packets.
- A curated document library and module-specific, Zotero-backed reading lists.

Built with **Astro** content collections and deployed as a full-stack
Cloudflare Worker at `https://edu.wuemsim.org`. The public `workers.dev`
route is disabled; production traffic uses the custom domain behind Cloudflare
Access.

## Architecture at a glance

- **Content is data.** Sim cases and modules are MDX with strict Zod schemas
  (`src/content.config.ts`); a malformed contribution fails the build instead of
  shipping. The document library is one YAML file.
- **Bibliography is pulled at build time** from a Zotero *group* library via a
  custom Content Layer loader (`src/loaders/zotero.ts`). Zotero renders the
  citations server-side in AMA style, so there's no citation engine in the bundle.
- **Cloudflare Access identifies learners.** Access can sit in front of the
  Worker, while API routes also validate the Access JWT before writing or
  exporting module responses.
- **Learner work is saved in D1.** Each learner has one current response per
  module prompt; submitting again updates that response.
- **Case packets stay private in R2.** Downloads pass through the authenticated
  Worker instead of being published as static assets.

## Curriculum

The required sequence is designed around the resident's working case:

1. **Learning Objectives and Educational Design** — define the gap, learner,
   objective, and assessment.
2. **Case Writing and Scenario Design** — turn that objective into a coherent,
   runnable scenario.
3. **Running the Case** — prepare the people, environment, cues, and contingency
   plan needed for reliable facilitation.
4. **Prebriefing and Debriefing** — establish psychological safety and plan a
   discussion tied to observed performance.

Technology in Simulation, Difficult Learners, and Simulation Research extend
the core sequence. The technology module now covers manikin operating models,
virtual and game-based simulation, technology selection, failure planning, and
evaluation—not just equipment setup.

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

The legacy Cloudflare Pages project at `https://washu-sim-edu.pages.dev` and
its preview hostnames remain covered by Cloudflare Access, but they are not the
production target for module responses. Use `https://edu.wuemsim.org` for
the D1-backed Worker API routes.

Security headers are served from `public/_headers`.

## Module responses

Modules can include structured free-text prompts in frontmatter under
`responsePrompts`. Learners submit responses from the module page; the API saves
one latest response per learner/module/prompt in Cloudflare D1. Faculty review
is via CSV export at `/api/responses/export.csv`.

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
4. Set the Cloudflare Access values in `wrangler.jsonc` or the Worker dashboard:
   - `TEAM_DOMAIN`: your Access team domain, e.g. `https://team.cloudflareaccess.com`
   - `POLICY_AUD`: this Access application's audience tag
   - `FACULTY_EMAILS`: comma-separated faculty emails allowed to export CSVs

For local API testing, Wrangler uses local D1 state:

```bash
npx wrangler d1 migrations apply washu-sim-edu-responses --local
npm run build
npx wrangler dev --local
```

## Access control — Cloudflare Access

Site access is controlled in Cloudflare Zero Trust. Module response API routes
also validate the Cloudflare Access JWT so submissions are tied to the signed-in
learner email.

### Current access state

- Application: `WUEM Sim Edu`
- Protected hostname: `edu.wuemsim.org`
- Protected Pages hostnames: `washu-sim-edu.pages.dev`,
  `*.washu-sim-edu.pages.dev`
- Application ID: `bd50748a-8788-40ae-898b-561ee9f40ec4`
- Policy ID: `96a940f4-8232-4829-b32e-67417193add3`
- Policy name: `WashU Email Domain`
- Decision: `allow`
- Include: email domain `wustl.edu`
- Include: email `sphadnisuf@gmail.com` for faculty export/admin access
- Precedence: `1`

The production Worker hostname and Pages preview hostnames require Cloudflare
Access sign-in. The retired `workers.dev` hostname should not be used.

### Restore the WashU email gate

When development previews no longer need to be public, restore the policy to:

- Policy name: `WashU Email Domain`
- Decision: `allow`
- Include: email domain `wustl.edu`
- Precedence: `1`

### Configure gating from scratch

1. Add the Worker to a custom domain (Access policies attach to a
   hostname, e.g. `sim.your-domain.org`).
2. Dashboard → **Zero Trust → Access → Applications → Add an application →
   Self-hosted**.
3. Application domain: the site's hostname.
4. Add a policy:
   - Action: **Allow**
   - Rule: **Emails** → paste the resident/faculty addresses
     (or **Emails ending in** `@wustl.edu` to allow the whole domain).
5. Pick a login method (One-time PIN works with no IdP setup — users get an
   email code).
6. Save. Visitors now hit an Access screen before the site loads.

### Moving to SSO later

Connect WashU's identity provider (Entra ID / SAML / OIDC) under **Zero Trust →
Settings → Authentication**, then change the policy rule from *Emails* to a
group/IdP claim. The site doesn't change.

## Contribution flow

1. Resident starts from the standard case template and adds an MDX file under
   `src/content/sim-cases/`.
2. Open a PR (the template prompts the rubric self-check). The build validates
   the schema; a preview deploy renders the case.
3. Faculty review against `docs/sim-case-rubric.md`, then merge the case when it
   meets the standard.

`CODEOWNERS` routes content changes to sim faculty for review. Replace the
placeholder handles before going live.
