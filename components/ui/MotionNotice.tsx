import { useEffect, useState } from 'react';

interface MotionNoticeProps {
  message: string | null;
  role: 'alert' | 'status';
  className: string;
}

const EXIT_DURATION_MS = 200;

export function MotionNotice({ message, role, className }: MotionNoticeProps) {
  const [displayMessage, setDisplayMessage] = useState(message);

  useEffect(() => {
    if (message !== null) {
      if (message === displayMessage) return;
      const timer = window.setTimeout(() => setDisplayMessage(message), 0);
      return () => window.clearTimeout(timer);
    }

    if (displayMessage !== null) {
      const timer = window.setTimeout(
        () => setDisplayMessage(null),
        EXIT_DURATION_MS,
      );
      return () => window.clearTimeout(timer);
    }
  }, [displayMessage, message]);

  if (displayMessage === null) return null;

  return (
    <p
      aria-hidden={message === null}
      className={`dashboard-notice ${className}`}
      data-visible={message !== null}
      role={message === null ? undefined : role}
    >
      {displayMessage}
    </p>
  );
}
