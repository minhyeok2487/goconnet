import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Clean dist directory
rmSync(resolve(__dirname, 'dist'), { recursive: true, force: true });
mkdirSync(resolve(__dirname, 'dist/assets'), { recursive: true });

// Build CSS with Tailwind via PostCSS
const postcss = (await import('postcss')).default;
const tailwindcss = (await import('tailwindcss')).default;
const autoprefixer = (await import('autoprefixer')).default;

const cssInput = readFileSync(resolve(__dirname, 'src/style.css'), 'utf8');
const cssResult = await postcss([tailwindcss, autoprefixer]).process(cssInput, {
  from: resolve(__dirname, 'src/style.css'),
  to: resolve(__dirname, 'dist/assets/style.css'),
});
writeFileSync(resolve(__dirname, 'dist/assets/style.css'), cssResult.css);
console.log('CSS processed');

// Build JS with esbuild - single bundle, no splitting
const result = await esbuild.build({
  entryPoints: [resolve(__dirname, 'src/main.tsx')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/assets/main.js'),
  format: 'iife',
  minify: true,
  sourcemap: false,
  target: ['chrome107', 'edge107'],
  jsx: 'automatic',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.css': 'css',
    '.png': 'file',
    '.svg': 'file',
    '.woff2': 'file',
    '.woff': 'file',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: [],
  metafile: true,
});

// Find CSS output from esbuild (xterm.css etc)
const outputs = Object.keys(result.metafile.outputs);
const mainCss = outputs.find(f => f.endsWith('.css'));

// Build index.html
let html = readFileSync(resolve(__dirname, 'index.html'), 'utf8');

const cssLinks = [
  '<link rel="stylesheet" href="./assets/style.css">',
  mainCss ? `<link rel="stylesheet" href="${mainCss.replace('dist/', './')}">` : '',
].filter(Boolean).join('\n');

html = html.replace('</head>', `${cssLinks}\n</head>`);
html = html.replace(
  '<script src="./src/main.tsx" type="module"></script>',
  '<script src="./assets/main.js"></script>'
);

writeFileSync(resolve(__dirname, 'dist/index.html'), html);
console.log('Build complete!');

// Print output summary
const text = await esbuild.analyzeMetafile(result.metafile, { verbose: false });
console.log(text);
