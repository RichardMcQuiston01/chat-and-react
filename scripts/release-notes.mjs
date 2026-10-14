// Prints the CHANGELOG section for one version, for use as GitHub release notes.
//
//   node scripts/release-notes.mjs 0.7.0 > notes.md
//
// A section starts at `## [x.y.z]` and ends at the next `## [` heading or the next `---` rule.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Returns the body of the section for `version`, without its heading.
 * @param {string} changelog
 * @param {string} version For example `0.7.0` (a leading `v` is ignored).
 * @returns {string}
 * @throws {Error} If the version has no section, or its section is empty.
 */
export function extractReleaseNotes(changelog, version) {
  const wanted = version.replace(/^v/, '');
  const lines = changelog.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) =>
    new RegExp(`^## \\[${wanted.replaceAll('.', '\\.')}\\](\\s|$)`).test(line),
  );
  if (headingIndex === -1) {
    const known = lines
      .filter((line) => line.startsWith('## ['))
      .map((line) => line.slice(3).trim())
      .join(', ');
    throw new Error(
      `CHANGELOG.md has no section for version ${wanted}. Sections found: ${known || 'none'}`,
    );
  }
  const body = [];
  for (const line of lines.slice(headingIndex + 1)) {
    if (line.startsWith('## [') || line.trim() === '---') break;
    body.push(line);
  }
  const notes = body.join('\n').trim();
  if (notes === '') {
    throw new Error(`The CHANGELOG.md section for version ${wanted} is empty`);
  }
  return `${notes}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node scripts/release-notes.mjs <version> [path/to/CHANGELOG.md]');
    process.exit(2);
  }
  const changelogPath = process.argv[3] ?? new URL('../CHANGELOG.md', import.meta.url);
  try {
    process.stdout.write(extractReleaseNotes(readFileSync(changelogPath, 'utf8'), version));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
