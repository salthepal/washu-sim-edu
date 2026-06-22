// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import cloudflare from "@astrojs/cloudflare";

// Static content pages are prerendered, while API endpoints run on Cloudflare
// for authenticated response submission and export.
export default defineConfig({
  site: 'https://washu-sim-edu.sphadnisuf.workers.dev',
  output: 'server',
  integrations: [mdx(), sitemap()],

  markdown: {
    shikiConfig: { theme: 'github-light' },
  },

  adapter: cloudflare()
});
