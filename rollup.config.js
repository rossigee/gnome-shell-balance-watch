import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
import scss from 'rollup-plugin-scss';
import { readFileSync } from 'fs';

const meta = JSON.parse(readFileSync('./src/metadata.json', 'utf8'));

export default {
  input: 'src/extension.ts',
  output: {
    file: 'dist/extension.js',
    format: 'iife',
    sourcemap: true,
    name: 'Extension',
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
    }),
    resolve({
      browser: true,
      exportConditions: ['browser'],
    }),
    commonjs(),
    json(),
    scss({
      fileName: 'stylesheet.css',
    }),
    copy({
      targets: [
        { src: 'res/schemas/*.xml', dest: 'build/schemas' },
        { src: 'res/schemas/*.compiled', dest: 'build/schemas' },
        { src: 'res/locale/**/*', dest: 'build/locale' },
        { src: 'res/stylesheet.css', dest: 'build' },
        { src: 'src/metadata.json', dest: 'build' },
        { src: 'src/prefs/gettext.ts', dest: 'build/prefs' },
      ],
      hook: 'writeBundle',
      get target() {
        return [
          {
            src: 'build',
            dest: '.',
          },
        ];
      },
    }),
  ],
  external: [
    '@girs/gio-2.0',
    '@girs/glib-2.0',
    '@girs/gobject-2.0',
    '@girs/gtk-4.0',
    '@girs/adw-1',
    '@girs/st-13',
    '@girs/clutter-13',
    '@girs/shell-15',
    '@girs/soup-3.0',
    '@girs/secret-1',
    '@gnome-shell/extensions/extension',
    '@gnome-shell/extensions/prefs',
    '@gnome-shell/ui/main',
    '@gnome-shell/ui/panelMenu',
    '@gnome-shell/ui/popupMenu',
  ],
  define: {
    'import.meta': JSON.stringify({
      url: `file://${process.cwd()}/extension.js`,
    }),
  },
};