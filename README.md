# WashU Emergency Medicine Simulation Education

A learning portal for the simulation component of the Emergency Medicine
residency Education Rotation: asynchronous case-design modules, annotated case
exemplars, **interactive case dissections**, a curated document library, and a
Zotero-backed reading list. Residents use it to build one simulation case with
a defensible teaching objective, intentional scenario structure, and debrief
plan.

Built with **Astro** content collections and deployed as a full-stack
Cloudflare Worker at `https://washu-sim-edu.sphadnisuf.workers.dev`. The
previous Cloudflare Pages deployment remains available only as a temporary
static fallback during cutover.

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
| `simCases` | `src/content/sim-cases/*.mdx` | The exemplar library. `status` marks review state. |
| `modules` | `src/content/modules/*.mdx` | Ordered simulation curriculum; can reference cases and Zotero tags. |
| `documents` | `src/content/documents.yaml` | Curated, tagged link library. |
| `bibliography` | Zotero API | Tag items by module; reading lists assemble themselves. |

Required fields per type live in `src/content.config.ts`. The contribution
standard is `docs/sim-case-rubric.md`.

## Case dissections (the "anatomy" view)

Any case can carry an interactive teardown that exposes the author's design
reasoning. It's authored inline — wrap the spans you want to annotate in a
`<Note>` component right inside the case MDX:

```mdx
the parent asks for <Note kind="distractor" title="Planted anchoring trap"
  note="Pulls the team toward a bronchodilator-first frame so the debrief can
  name anchoring bias out loud.">a breathing treatment like last time</Note>
```

- Set `anatomy: true` in the case frontmatter to expose the dissection and the
  "Dissect this case" button.
- The **same MDX** renders clean prose on `/cases/<id>/` and an interactive
  dissection on `/cases/<id>/anatomy/` — one source of truth, no duplicated text.
- `kind` is one of: `objective`, `decision-point`, `distractor`, `cue`,
  `fidelity`, `debrief-hook`, `safety` (each color-coded, filterable).
- The dissection page gives learners hover/tap annotations, a category filter,
  and a **guided step-through** of the case in design order.

See `src/content/sim-cases/pediatric-anaphylaxis.mdx` for a worked example.

## Deploy to Cloudflare Workers

```bash
npm run check
npm run build
npm run deploy
```

The Worker serves both prerendered content and API routes. Static assets are
deployed from Astro's generated `dist/client` output, while server code runs via
the Cloudflare adapter entrypoint.

The old Cloudflare Pages project at `https://washu-sim-edu.pages.dev` is a
temporary static fallback during migration. Do not use it as the production
target for module responses because Pages does not run the D1-backed API routes
from this Worker build.

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

- Application: `WashU Sim EDU`
- Protected hostname: `washu-sim-edu.sphadnisuf.workers.dev`
- Application ID: `bd50748a-8788-40ae-898b-561ee9f40ec4`
- Policy ID: `96a940f4-8232-4829-b32e-67417193add3`
- Policy name: `WashU Email Domain`
- Decision: `allow`
- Include: email domain `wustl.edu`
- Include: email `sphadnisuf@gmail.com` for faculty export/admin access
- Precedence: `1`

The production Worker hostname requires Cloudflare Access sign-in once gating is
enabled. Preview or alternate hostnames are separate hostnames and are not
covered by this Access application unless added explicitly.

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

1. Resident starts from the standard case template, adds an MDX file under
   `src/content/sim-cases/` with `status: draft`.
2. Open a PR (the template prompts the rubric self-check). The build validates
   the schema; a preview deploy renders the case.
3. Faculty review against `docs/sim-case-rubric.md`. If it clears, flip
   `status: peer-reviewed` and merge — it joins the public exemplar list.

`CODEOWNERS` routes content changes to sim faculty for review. Replace the
placeholder handles before going live.
