// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import cloudflare from "@astrojs/cloudflare";

// Fully static build. Authentication is enforced *in front* of the site by
// Cloudflare Access (email-allowlist policy), so the app itself ships no auth code.
// Production Pages hostname. Authentication is handled by Cloudflare Access.
export default defineConfig({
  site: 'https://washu-sim-edu.pages.dev',
  output: 'static',
  integrations: [mdx(), sitemap()],

  markdown: {
    shikiConfig: { theme: 'github-light' },
  },

  adapter: cloudflare()
});