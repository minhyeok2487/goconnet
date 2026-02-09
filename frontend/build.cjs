const esbuild = require('esbuild');
const { mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } = require('fs');
const { resolve, join } = require('path');

async function build() {
  const root = __dirname;

  // Ensure dist/assets exists
  mkdirSync(resolve(root, 'dist/assets'), { recursive: true });

  // Clean only files in dist/assets (avoid rmSync crash on Node v24 + unicode paths)
  try {
    const files = readdirSync(resolve(root, 'dist/assets'));
    for (const f of files) {
      unlinkSync(join(resolve(root, 'dist/assets'), f));
    }
  } catch (e) { /* ignore */ }

  // Build CSS with Tailwind via PostCSS
  const postcss = require('postcss');
  const tailwindcss = require('tailwindcss');
  const autoprefixer = require('autoprefixer');

  const cssInput = readFileSync(resolve(root, 'src/style.css'), 'utf8');
  const cssResult = await postcss([tailwindcss, autoprefixer]).process(cssInput, {
    from: resolve(root, 'src/style.css'),
    to: resolve(root, 'dist/assets/style.css'),
  });
  writeFileSync(resolve(root, 'dist/assets/style.css'), cssResult.css);
  console.log('CSS processed');

  // Build JS with esbuild - single bundle, no splitting
  const result = await esbuild.build({
    entryPoints: [resolve(root, 'src/main.tsx')],
    bundle: true,
    outfile: resolve(root, 'dist/assets/main.js'),
    format: 'iife',
    minify: true,
    sourcemap: false,
    target: ['chrome107', 'edge107'],
    jsx: 'automatic',
    loader: {
      '.tsx': 'tsx', '.ts': 'ts', '.css': 'css',
      '.png': 'file', '.svg': 'file', '.woff2': 'file', '.woff': 'file',
    },
    define: { 'process.env.NODE_ENV': '"production"' },
    metafile: true,
  });

  // Find CSS output from esbuild (xterm.css etc)
  const outputs = Object.keys(result.metafile.outputs);
  const mainCss = outputs.find(f => f.endsWith('.css'));

  // Build index.html
  let html = readFileSync(resolve(root, 'index.html'), 'utf8');
  const cssLinks = [
    '<link rel="stylesheet" href="./assets/style.css">',
    mainCss ? '<link rel="stylesheet" href="' + mainCss.replace('dist/', './') + '">' : '',
  ].filter(Boolean).join('\n');

  html = html.replace('</head>', cssLinks + '\n</head>');
  html = html.replace(
    '<script src="./src/main.tsx" type="module"></script>',
    '<script src="./assets/main.js"></script>'
  );

  writeFileSync(resolve(root, 'dist/index.html'), html);
  console.log('Build complete!');

  const text = await esbuild.analyzeMetafile(result.metafile, { verbose: false });
  console.log(text);
}

build().catch((err) => { console.error(err); process.exit(1); });
