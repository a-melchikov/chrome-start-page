import { useEffect, useRef } from 'react';

const FADE_DURATION_MS = 1000;

function nextFrame(): Keyframe {
  return {
    transform: `translate(${Math.random() * 50 - 25}%, ${Math.random() * 50 - 25}%) rotate(${Math.random() * 180 - 90}deg) scale(${0.8 + Math.random() * 0.7}, ${0.7 + Math.random() * 0.8})`,
    opacity: 0.2 + Math.random() * 0.35,
  };
}

/** Independent, continuously joined trajectories; React never renders per frame. */
export function MusicSurfaceWaves({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const motions = useRef(new Set<Animation>());
  const paused = useRef(false);
  const wasActive = useRef(false);

  useEffect(() => {
    let stopped = false;
    const running = motions.current;
    const move = (layer: Element, from: Keyframe) => {
      if (typeof layer.animate !== 'function') return;
      const to = nextFrame();
      const motion = layer.animate([from, to], {
        duration: 3500 + Math.random() * 3500,
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
        fill: 'forwards',
      });
      running.add(motion);
      if (paused.current) motion.pause();
      motion.onfinish = () => {
        running.delete(motion);
        motion.cancel();
        if (!stopped) move(layer, to);
      };
    };
    root.current
      ?.querySelectorAll('span')
      .forEach((layer) => move(layer, nextFrame()));
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
      <span />
      <span />
      <span />
    </div>
  );
}
