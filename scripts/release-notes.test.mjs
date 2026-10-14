import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractReleaseNotes } from './release-notes.mjs';

const changelog = `# CHANGELOG

---

## [Unreleased]

---

## [0.7.0] — 2026-10-14

### Added

- Something new

---

## [0.6.0] — 2026-10-14

### Changed

- **Breaking:** something

## [0.5.0] — 2026-07-15

- Older
`;

describe('extractReleaseNotes', () => {
  it('returns the section body up to the next rule', () => {
    assert.equal(extractReleaseNotes(changelog, '0.7.0'), '### Added\n\n- Something new\n');
  });

  it('stops at the next version heading when there is no rule', () => {
    assert.equal(
      extractReleaseNotes(changelog, '0.6.0'),
      '### Changed\n\n- **Breaking:** something\n',
    );
  });

  it('accepts a leading v and the last section', () => {
    assert.equal(extractReleaseNotes(changelog, 'v0.5.0'), '- Older\n');
  });

  it('does not match a version that only shares a prefix', () => {
    assert.throws(() => extractReleaseNotes(changelog, '0.7'), /no section for version 0\.7/);
  });

  it('names the sections it did find when the version is missing', () => {
    assert.throws(
      () => extractReleaseNotes(changelog, '9.9.9'),
      /no section for version 9\.9\.9\. Sections found: \[Unreleased\], \[0\.7\.0\] — 2026-10-14, /,
    );
  });

  it('refuses an empty section', () => {
    assert.throws(
      () => extractReleaseNotes('## [1.0.0] — d\n\n---\n', '1.0.0'),
      /section for version 1\.0\.0 is empty/,
    );
  });

  it('copes with Windows line endings', () => {
    assert.equal(
      extractReleaseNotes(changelog.replaceAll('\n', '\r\n'), '0.7.0'),
      '### Added\n\n- Something new\n',
    );
  });
});
