import changelog from '../CHANGELOG.md?raw';

export interface ReleaseNotes {
  version: string;
  releasedAt: string;
  content: string;
}

// Only version sections appear in the app; the development notes stay in Git.
export const RELEASE_NOTES: readonly ReleaseNotes[] = changelog
  .split(/^## /m)
  .flatMap((section) => {
    const [heading = '', ...lines] = section.split('\n');
    const match = /^[vV]?(\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})$/.exec(
      heading.trim(),
    );
    return match
      ? [
          {
            version: match[1]!,
            releasedAt: match[2]!,
            content: lines.join('\n').trim(),
          },
        ]
      : [];
  });

export function formatReleaseDate(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
}
