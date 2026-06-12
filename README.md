# WashU Emergency Medicine Simulation Education

A gated learning portal for the Emergency Medicine residency simulation track:
annotated case exemplars, **interactive case dissections**, a structured
curriculum, a curated document library, and a live Zotero-backed reading list.
Built with **Astro** content collections, hosted on **Cloudflare Pages**, gated
by **Cloudflare Access** (email allowlist).

## Architecture at a glance

- **Content is data.** Sim cases and modules are MDX with strict Zod schemas
  (`src/content.config.ts`); a malformed contribution fails the build instead of
  shipping. The document library is one YAML file.
- **Bibliography is pulled at build time** from a Zotero *group* library via a
  custom Content Layer loader (`src/loaders/zotero.ts`). Zotero renders the
  citations server-side in AMA style, so there's no citation engine in the bundle.
- **No auth code in the app.** Cloudflare Access sits in front of the static
  site and enforces the email allowlist. Swapping to SSO later is a policy
  change in the dashboard, not a rebuild.

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
| `simCases` | `src/content/sim-cases/*.mdx` | The exemplar library. `status` gates public visibility. |
| `modules` | `src/content/modules/*.mdx` | Ordered curriculum; can reference cases and Zotero tags. |
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

## Gate the site — Cloudflare Access (email allowlist)

This restricts the whole site to a list of resident/faculty emails. No app code.

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
