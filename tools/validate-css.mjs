// CSS checker #2: w3c-css-validator. Sends each .css file to the W3C CSS
// validation service (jigsaw.w3.org) and reports errors/warnings.
// NOTE: this is an EXTERNAL network call -- your CSS text is uploaded to W3C's
// public validator. The service asks callers to stay under ~1 req/sec, so we
// pace requests. Skips cleanly (non-fatal) if offline.
import { readFileSync } from 'node:fs';
import w3c from 'w3c-css-validator';
import { cssFiles } from './_files.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const files = cssFiles('.');
let totalErrors = 0;

for (let i = 0; i < files.length; i++) {
	const f = files[i];
	const css = readFileSync(f, 'utf8');
	try {
		const res = await w3c.validateText(css, { timeout: 20000 });
		const nErr = res.errors?.length || 0, nWarn = res.warnings?.length || 0;
		totalErrors += nErr;
		console.log(`\n${f}: ${res.valid ? 'VALID' : nErr + ' error(s)'}${nWarn ? `, ${nWarn} warning(s)` : ''}`);
		for (const e of res.errors || []) console.log(`  ✗ line ${e.line}: ${(e.message || '').trim()}`);
		for (const w of res.warnings || []) console.log(`  ⚠ line ${w.line}: ${(w.message || '').trim()}`);
	} catch (err) {
		console.error(`\n${f}: request failed -- ${err.message} (W3C service needs network)`);
	}
	if (i < files.length - 1) await sleep(1200);   // be polite to the shared service
}

process.exit(totalErrors ? 1 : 0);
