// @ts-check
import {defineConfig, envField, fontProviders} from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://aimerypellerin.fr',

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: [
        '@heroui/react',
        '@react-aria/ssr',
        '@react-aria/util'
      ],
    },
  },

  integrations: [react(), sitemap({filter: (page) => !/\/(404|500)\/?$/.test(page)})],

  fonts: [{
    provider: fontProviders.fontsource(),
    name: "Ubuntu",
    cssVariable: "--font-ubuntu",
  }, {
    provider: fontProviders.fontsource(),
    name: "Ubuntu Mono",
    cssVariable: "--font-ubuntu-mono",
  }],

  // read at runtime by the contact route, never inlined into the build
  env: {
    schema: {
      RESEND_API_KEY: envField.string({context: 'server', access: 'secret', optional: true}),
      CONTACT_TO_EMAIL: envField.string({context: 'server', access: 'secret', optional: true}),
      CONTACT_FROM_EMAIL: envField.string({context: 'server', access: 'secret', optional: true}),
    },
  },

  adapter: netlify()
});