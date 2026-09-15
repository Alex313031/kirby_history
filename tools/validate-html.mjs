// HTML checker: html-validate. Validates every discovered .html file against
// the config in .htmlvalidate.json (extends html-validate:recommended).
// Offline -- no network. Exits non-zero if any file has errors.
import { execFileSync } from 'node:child_process';
import { htmlFiles } from './_files.mjs';

const BIN = 'node_modules/.bin/html-validate';
const files = htmlFiles('.');
if (!files.length) { console.log('no HTML files found'); process.exit(0); }

console.log(`html-validate: ${files.join(', ')}\n`);
try {
	execFileSync(BIN, files, { stdio: 'inherit' });
	console.log('All HTML valid.');
} catch (err) {
	process.exit(err.status || 1);   // findings already streamed by the CLI
}
