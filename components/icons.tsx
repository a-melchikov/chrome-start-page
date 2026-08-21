import type { ComponentPropsWithoutRef } from 'react';

type IconProps = ComponentPropsWithoutRef<'svg'>;

export function PlusIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3a9 9 0 0 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a1.5 1.5 0 0 1 0-3h2.25A6.75 6.75 0 0 0 21 8.25C21 5.35 16.97 3 12 3Z"
      />
      <path
        strokeLinecap="round"
        d="M7.5 10.5h.008v.008H7.5v-.008Zm2.25-3h.008v.008H9.75V7.5Zm4.5 0h.008v.008h-.008V7.5Zm2.25 3h.008v.008H16.5v-.008Z"
      />
    </svg>
  );
}
