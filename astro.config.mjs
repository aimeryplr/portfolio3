// @ts-check
import {defineConfig, fontProviders} from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

import icon from 'astro-icon';

import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@react-aria/i18n', '@adobe/react-spectrum']
    }
  },

  integrations: [react(), icon()],

  fonts: [{
    provider: fontProviders.fontsource(),
    name: "Ubuntu",
    cssVariable: "--font-ubuntu",
  }],

  adapter: netlify()
});