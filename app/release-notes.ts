import changelog from '../CHANGELOG.md?raw';

export interface ReleaseNotes {
  version: string;
  status: string;
  content: string;
}

// Only version sections appear in the app; the development notes stay in Git.
export const RELEASE_NOTES: readonly ReleaseNotes[] = changelog
  .split(/^## /m)
  .flatMap((section) => {
    const [heading = '', ...lines] = section.split('\n');
    const match = /^(\d+\.\d+\.\d+) — (.+)$/.exec(heading.trim());
    return match
      ? [
          {
            version: match[1]!,
            status: match[2]!,
            content: lines.join('\n').trim(),
          },
        ]
      : [];
  });
