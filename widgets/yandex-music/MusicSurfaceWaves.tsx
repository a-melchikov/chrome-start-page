import { useEffect, useId, useRef } from 'react';

const FADE_DURATION_MS = 1000;

const RIBBONS = [
  'M-120 170C40-20 140 370 310 180S520 20 720 230L720 310C510 100 460 370 310 245S50 80-120 255Z',
  'M-120 250C60 400 160-50 340 150S560 400 720 130L720 215C550 450 470 340 340 215S70 460-120 330Z',
  'M-120 110C80 300 180-30 350 200S570 140 720 260L720 340C550 220 470 440 350 270S70 380-120 195Z',
  'M-120 300C20 70 210 390 360 150S560 200 720 90L720 175C550 300 480 70 360 225S30 150-120 380Z',
];

function nextPosition(): Keyframe {
  return {
    transform: `translate(${Math.random() * 70 - 35}%, ${Math.random() * 60 - 30}%) rotate(${Math.random() * 120 - 60}deg) scale(${0.85 + Math.random() * 0.5}, ${0.65 + Math.random() * 0.8})`,
  };
}

/** Independent, continuously joined trajectories; React never renders per frame. */
export function MusicSurfaceWaves({ active }: { active: boolean }) {
  const gradientId = useId();
  const root = useRef<HTMLDivElement>(null);
  const motions = useRef(new Set<Animation>());
  const paused = useRef(false);
  const wasActive = useRef(false);

  useEffect(() => {
    let stopped = false;
    const running = motions.current;
    const move = (
      layer: Element,
      from: Keyframe,
      next: (previous: Keyframe) => Keyframe,
      duration: () => number,
    ) => {
      if (typeof layer.animate !== 'function') return;
      const to = next(from);
      const motion = layer.animate([from, to], {
        duration: duration(),
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
        fill: 'forwards',
      });
      running.add(motion);
      if (paused.current) motion.pause();
      motion.onfinish = () => {
        running.delete(motion);
        motion.cancel();
        if (!stopped) move(layer, to, next, duration);
      };
    };
    root.current?.querySelectorAll('span').forEach((layer, index) => {
      move(
        layer,
        nextPosition(),
        nextPosition,
        () => 1800 + Math.random() * 1800,
      );
      move(
        layer,
        { opacity: index % 2 === 0 ? 0.22 + index * 0.04 : 0.5 + index * 0.04 },
        (previous) => ({
          opacity:
            Number(previous.opacity) < 0.4
              ? 0.45 + Math.random() * 0.2
              : 0.18 + Math.random() * 0.14,
        }),
        () => 900 + Math.random() * 700,
      );
    });
    return () => {
      stopped = true;
      running.forEach((motion) => {
        motion.onfinish = null;
        motion.cancel();
      });
      running.clear();
    };
  }, []);

  useEffect(() => {
    const pause = () => {
      paused.current = true;
      wasActive.current = false;
      motions.current.forEach((motion) => motion.pause());
    };
    if (active) {
      wasActive.current = true;
      paused.current = false;
      motions.current.forEach((motion) => motion.play());
      return;
    }
    if (!wasActive.current) {
      pause();
      return;
    }
    const timeout = setTimeout(pause, FADE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [active]);

  return (
    <div
      ref={root}
      className="music-surface-waves"
      data-active={active}
      aria-hidden="true"
    >
      {RIBBONS.map((path, index) => (
        <span key={path}>
          <svg
            viewBox="0 0 600 450"
            preserveAspectRatio="none"
            focusable="false"
          >
            <defs>
              <linearGradient
                id={`${gradientId}-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0" stopColor="white" stopOpacity="0" />
                <stop offset="0.3" stopColor="white" stopOpacity="0.25" />
                <stop offset="0.5" stopColor="white" stopOpacity="0.8" />
                <stop offset="0.7" stopColor="white" stopOpacity="0.25" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={path} fill={`url(#${gradientId}-${index})`} />
          </svg>
        </span>
      ))}
    </div>
  );
}
