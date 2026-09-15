// HTML prettifier (htmlfy). Formats every source .html into dist/ so the
// deployed markup stays readable/explorable in devtools (NOT minified -- the
// site is small and meant to be inspectable). Inline <script>/<style> content
// is left byte-for-byte via the ignore list; only the surrounding markup is
// formatted. Exports prettifyAll() for the dist build (tools/dist.mjs); also
// runs standalone via `node tools/htmlfy.mjs`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prettify } from 'htmlfy';
import { htmlFiles } from './_files.mjs';

const OUT = 'dist';
const CFG = { tab_size: 2, ignore: ['script', 'style'] };   // format markup, keep inline JS/CSS verbatim

// Prettify every source .html into dist/, preserving paths. Returns the list
// of written dist paths (so the build can validate them).
export function prettifyAll() {
	const dests = [];
	for (const f of htmlFiles('.')) {
		const src = readFileSync(f, 'utf8');
		let out;
		try {
			out = prettify(src, CFG).replace(/[ \t]+$/gm, '');   // htmlfy can leave trailing spaces; strip them
		} catch (err) {
			console.warn(`  ! htmlfy failed on ${f} (${err.message}) -- copying source as-is`);
			out = src;
		}
		const dest = join(OUT, f);
		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, out.endsWith('\n') ? out : out + '\n');
		dests.push(dest);
		console.log(`  ${f}`);
	}
	return dests;
}

// Run directly (`node tools/htmlfy.mjs`); stay quiet when imported by dist.mjs.
if (process.argv[1] === fileURLToPath(import.meta.url)) prettifyAll();
