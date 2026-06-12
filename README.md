# WashU Emergency Medicine Simulation Education

A learning portal for the simulation component of the Emergency Medicine
residency Education Rotation: asynchronous case-design modules, annotated case
exemplars, **interactive case dissections**, a curated document library, and a
Zotero-backed reading list. Residents use it to build one simulation case with
a defensible teaching objective, intentional scenario structure, and debrief
plan.

Built with **Astro** content collections and hosted on **Cloudflare Pages** at
`https://washu-sim-edu.pages.dev`.

## Architecture at a glance

- **Content is data.** Sim cases and modules are MDX with strict Zod schemas
  (`src/content.config.ts`); a malformed contribution fails the build instead of
  shipping. The document library is one YAML file.
- **Bibliography is pulled at build time** from a Zotero *group* library via a
  custom Content Layer loader (`src/loaders/zotero.ts`). Zotero renders the
  citations server-side in AMA style, so there's no citation engine in the bundle.
- **No auth code in the app.** When gating is enabled, Cloudflare Access sits in
  front of the static site and enforces the email allowlist. Swapping to SSO
  later is a policy change in the dashboard, not a rebuild.

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output to ./dist
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

## Deploy to Cloudflare Pages

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
   select the repo.
3. Build settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Output directory: `dist`
4. (Optional) Add build environment variables `ZOTERO_GROUP_ID`,
   `ZOTERO_API_KEY`, `ZOTERO_STYLE`.
5. Deploy. PRs get preview deployments automatically.

## Access control — Cloudflare Access

The app contains no authentication code. Access is controlled in Cloudflare Zero
Trust.

### Current development state

Gating is temporarily disabled while the site is under active development. The
existing Access application remains attached to `washu-sim-edu.pages.dev`, but
its policy is currently:

- Application: `WashU Sim EDU`
- Application ID: `bd50748a-8788-40ae-898b-561ee9f40ec4`
- Policy ID: `96a940f4-8232-4829-b32e-67417193add3`
- Policy name: `Temporary development bypass`
- Decision: `bypass`
- Include: `everyone`

This makes the Pages hostname publicly reachable without changing the app code
or deleting the Access application.

### Restore the WashU email gate

When development previews no longer need to be public, restore the policy to:

- Policy name: `WashU Email Domain`
- Decision: `allow`
- Include: email domain `wustl.edu`
- Precedence: `1`

### Configure gating from scratch

1. Add the Pages project to a custom domain (Access policies attach to a
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
