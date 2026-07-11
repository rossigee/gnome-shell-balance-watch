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
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  external: external,
  loader: { '.ts': 'ts' },
  tsconfig: join(rootDir, 'tsconfig.json'),
  logLevel: 'info',
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