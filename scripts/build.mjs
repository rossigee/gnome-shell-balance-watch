#!/usr/bin/env node
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const external = [
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
];

console.log('Building extension...');

const buildDir = join(rootDir, 'build');
const distDir = join(rootDir, 'dist');
mkdirSync(distDir, { recursive: true });
mkdirSync(buildDir, { recursive: true });

await esbuild.build({
  entryPoints: [join(rootDir, 'src/extension.ts')],
  bundle: true,
  outfile: join(distDir, 'extension.js'),
  format: 'esm',
  platform: 'neutral',
  target: 'es2020',
  sourcemap: true,
  external: external,
  loader: { '.ts': 'ts' },
  tsconfig: join(rootDir, 'tsconfig.json'),
  logLevel: 'info',
  plugins: [{
    name: 'external-modules',
    setup(build) {
      build.onResolve({ filter: /^resource:\/\// }, args => ({
        path: args.path,
        external: true,
      }));
    },
  }],
});

console.log('Copying resources...');

const metadata = JSON.parse(readFileSync(join(rootDir, 'src/metadata.json'), 'utf8'));
try {
  const gitVersion = execSync('git describe --dirty --always', { cwd: rootDir, encoding: 'utf8' }).trim();
  metadata['git-version'] = gitVersion;
  console.log(`Git version: ${gitVersion}`);
} catch (e) {
  console.log('Not a git repo or git not available');
}
writeFileSync(join(buildDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

mkdirSync(join(buildDir, 'schemas'), { recursive: true });
copyFileSync(
  join(rootDir, 'res/schemas/org.gnome.shell.extensions.balance-watch.gschema.xml'),
  join(buildDir, 'schemas/org.gnome.shell.extensions.balance-watch.gschema.xml')
);

try {
  execSync('glib-compile-schemas build/schemas', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.log('Note: glib-compile-schemas not available');
}

copyFileSync(join(rootDir, 'res/stylesheet.css'), join(buildDir, 'stylesheet.css'));

mkdirSync(join(buildDir, 'prefs'), { recursive: true });
copyFileSync(join(rootDir, 'src/prefs/gettext.ts'), join(buildDir, 'prefs/gettext.ts'));

console.log('\nBuild complete!');