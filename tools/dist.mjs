// Site build -> a complete, servable dist/ tree:
//   1. clean dist/
//   2. copy every asset as-is (css/js/img/sounds/manuals/icons/config)
//   3. PRETTIFY the HTML into place with htmlfy (tools/htmlfy.mjs -> prettifyAll):
//      deployed HTML stays readable/explorable in devtools, not minified.
// The denylist below is dev-only stuff that must NOT ship -- extend as needed.
import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, extname, join } from 'node:path';
import { prettifyAll } from './htmlfy.mjs';

const OUT = 'dist';
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.tmp', 'tools']);
const SKIP_FILES = new Set([
	'package.json', 'package-lock.json', '.gitignore', '.htmlvalidate.json',
	'.eslintcache', '.DS_Store', 'Thumbs.db', '.nvmrc',
]);
const SKIP_EXT = new Set(['.md', '.py']);   // dev docs + build scripts (README.md, LICENSE.md, make_thumbs.py)

// Recursively copy every non-HTML asset (HTML is prettified separately) into dist/.
function copyAssets(dir = '.') {
	let n = 0;
	for (const name of readdirSync(dir)) {
		if (SKIP_DIRS.has(name)) continue;
		const p = join(dir, name);
		if (statSync(p).isDirectory()) { n += copyAssets(p); continue; }
		if (SKIP_FILES.has(name)) continue;
		const ext = extname(name).toLowerCase();
		if (ext === '.html') continue;          // handled by prettify
		if (SKIP_EXT.has(ext)) continue;
		const dest = join(OUT, p);
		mkdirSync(dirname(dest), { recursive: true });
		cpSync(p, dest);
		n++;
	}
	return n;
}

// Sum file sizes under a dir (0 if it doesn't exist).
function dirSize(dir) {
	let bytes = 0;
	try {
		for (const name of readdirSync(dir)) {
			const p = join(dir, name);
			const st = statSync(p);
			bytes += st.isDirectory() ? dirSize(p) : st.size;
		}
	} catch { /* dir absent */ }
	return bytes;
}
const mb = (b) => (b / 1048576).toFixed(1) + ' MB';

console.log(`\ncleaning ${OUT}/ ...`);
rmSync(OUT, { recursive: true, force: true });

console.log('copying assets ...');
const assetCount = copyAssets('.');
console.log(`  ${assetCount} asset file(s) copied`);

console.log('prettifying HTML (htmlfy) ...');
const distHtml = prettifyAll();
console.log(`  ${distHtml.length} HTML file(s) formatted`);

// Validate the PRETTIFIED output -- prettify can introduce issues the source
// didn't have (e.g. trailing whitespace), so gate the build on dist being valid.
console.log('validating dist HTML (html-validate) ...');
try {
	execFileSync('node_modules/.bin/html-validate', distHtml, { stdio: 'inherit' });
	console.log('  dist HTML valid');
} catch (err) {
	console.error('  dist HTML FAILED validation (see above) -- build aborted');
	process.exit(err.status || 1);
}

// Size report -- core payload is tracked separately from the on-demand manuals/.
const total = dirSize(OUT);
const manuals = dirSize(join(OUT, 'manuals'));
console.log(`\nBuild complete -> ${OUT}/   (serve it with: npm run dist-serve)`);
console.log(`Size: core ${mb(total - manuals)}  +  manuals ${mb(manuals)} (on-demand)  =  ${mb(total)} total`);
