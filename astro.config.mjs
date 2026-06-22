// @ts-check
import {defineConfig, fontProviders} from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

import icon from 'astro-icon';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: "server",

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: [
        '@heroui/react',
        '@react-aria/i18n',
        '@react-aria/ssr',
        '@react-aria/util'
      ],
    },
  },

  integrations: [react(), icon()],

  fonts: [{
    provider: fontProviders.fontsource(),
    name: "Ubuntu",
    cssVariable: "--font-ubuntu",
  }],

  adapter: node({ mode: 'standalone' })
});