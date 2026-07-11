import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

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
    commonjs(),
    json(),
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
    '@gnome-shell/misc/config',
  ],
};