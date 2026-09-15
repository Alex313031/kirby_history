// Shared file discovery for the tooling scripts. Walks the repo, skipping
// build/output/vendor dirs. Returns repo-relative paths.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['node_modules', 'dist', '.git', '.tmp', 'vendor']);

export function walk(dir, ext, out = []) {
	for (const name of readdirSync(dir)) {
		if (SKIP.has(name)) continue;
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, ext, out);
		else if (name.endsWith(ext)) out.push(p);
	}
	return out;
}

export const htmlFiles = (root = '.') => walk(root, '.html').sort();
export const cssFiles = (root = '.') => walk(root, '.css').sort();
