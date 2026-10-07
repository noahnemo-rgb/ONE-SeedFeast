import path from 'node:path';
import { reactRouter } from '@react-router/dev/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import tsconfigPaths from 'vite-tsconfig-paths';
import { addRenderIds } from './plugins/addRenderIds';
import { aliases } from './plugins/aliases';
import consoleToParent from './plugins/console-to-parent';
import { layoutWrapperPlugin } from './plugins/layouts';
import { loadFontsFromTailwindSource } from './plugins/loadFontsFromTailwindSource';
import { nextPublicProcessEnv } from './plugins/nextPublicProcessEnv';
import { restart } from './plugins/restart';
import { restartEnvFileChange } from './plugins/restartEnvFileChange';

export default defineConfig({
  // Keep them available via import.meta.env.NEXT_PUBLIC_*
  envPrefix: 'NEXT_PUBLIC_',
  optimizeDeps: {
    // Explicitly include fast-glob, since it gets dynamically imported and we
    // don't want that to cause a re-bundle.
    include: ['fast-glob', 'lucide-react'],
    exclude: [
      '@hono/auth-js/react',
      '@hono/auth-js',
      '@auth/core',
      '@hono/auth-js',
      'hono/context-storage',
      '@auth/core/errors',
      'fsevents',
      'lightningcss',
    ],
  },
  logLevel: 'info',
  build: {
    // index.ts and route-builder.ts use top-level await. Vite's default
    // browser target stops at ES2020 and rejects that syntax.
    target: 'es2022',
  },
  plugins: [
    nextPublicProcessEnv(),
    restartEnvFileChange(),
    reactRouterHonoServer({
      // Absolute path so the plugin can split modules imported by this entry.
      // A relative "./index.ts" does not match Vite's absolute module ids, so
      // the React Router server build shares a chunk with createHonoServer and
      // the production prerender deadlocks.
      serverEntryPoint: path.resolve(__dirname, 'index.ts'),
      runtime: 'node',
    }),
    babel({
      // TypeScript is compiled by Vite. This plugin only runs styled-jsx,
      // and its parser rejects `import type` in .ts/.tsx files.
      include: ['src/**/*.{js,jsx}'],
      exclude: /node_modules/, // skip everything else
      babelConfig: {
        babelrc: false, // don’t merge other Babel files
        configFile: false,
        plugins: ['styled-jsx/babel'],
      },
    }),
    restart({
      restart: [
        'src/**/page.jsx',
        'src/**/page.tsx',
        'src/**/layout.jsx',
        'src/**/layout.tsx',
        'src/**/route.js',
        'src/**/route.ts',
      ],
    }),
    consoleToParent(),
    loadFontsFromTailwindSource(),
    addRenderIds(),
    reactRouter(),
    tsconfigPaths(),
    aliases(),
    layoutWrapperPlugin(),
  ],
  resolve: {
    alias: {
      lodash: 'lodash-es',
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  clearScreen: false,
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 4000,
    fs: {
      allow: ['..', '../../shared'],
    },
    hmr: {
      overlay: false,
    },
    warmup: {
      clientFiles: ['./src/app/**/*', './src/app/root.tsx', './src/app/routes.ts'],
    },
  },
});
