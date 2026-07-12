import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/extension.ts',
  output: {
    file: 'dist/extension.js',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
  external: [
    'gi://Gio',
    'gi://GLib',
    'gi://GObject',
    'gi://Gtk',
    'gi://Adw',
    'gi://St',
    'gi://Clutter',
    'gi://GnomeShell',
    'gi://Soup',
    'gi://Secret',
    'resource:///org/gnome/shell/extensions/extension.js',
    'resource:///org/gnome/shell/extensions/prefs.js',
    'resource:///org/gnome/shell/ui/main.js',
    'resource:///org/gnome/shell/ui/panelMenu.js',
    'resource:///org/gnome/shell/ui/popupMenu.js',
    'resource:///org/gnome/shell/misc/config.js',
  ],
};