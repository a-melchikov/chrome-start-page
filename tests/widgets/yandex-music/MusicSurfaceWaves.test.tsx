import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicSurfaceWaves } from '../../../widgets/yandex-music/MusicSurfaceWaves';

type Motion = Pick<Animation, 'play' | 'pause' | 'cancel' | 'onfinish'>;
const originalAnimate = Element.prototype.animate;
let motions: Motion[] = [];
const animate = vi.fn<
  (frames: Keyframe[], options: KeyframeAnimationOptions) => Animation
>(() => {
  const motion: Motion = {
    play: vi.fn(),
    pause: vi.fn(),
    cancel: vi.fn(),
    onfinish: null,
  };
  motions.push(motion);
  return motion as Animation;
});

beforeEach(() => {
  vi.useFakeTimers();
  motions = [];
  animate.mockClear();
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: animate,
  });
});
afterEach(() => {
  vi.useRealTimers();
  if (originalAnimate)
    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      value: originalAnimate,
    });
  else Reflect.deleteProperty(Element.prototype, 'animate');
});

describe('MusicSurfaceWaves', () => {
  it('fades for a second before pausing and resumes the same trajectories', () => {
    const view = render(<MusicSurfaceWaves active />);
    const layer = view.container.firstElementChild;
    expect(motions).toHaveLength(3);
    view.rerender(<MusicSurfaceWaves active={false} />);
    expect(layer).toHaveAttribute('data-active', 'false');
    expect(view.container.firstElementChild).toBe(layer);
    act(() => vi.advanceTimersByTime(999));
    motions.forEach((motion) => expect(motion.pause).not.toHaveBeenCalled());
    act(() => vi.advanceTimersByTime(1));
    motions.forEach((motion) => {
      expect(motion.pause).toHaveBeenCalledOnce();
      expect(motion.cancel).not.toHaveBeenCalled();
    });
    view.rerender(<MusicSurfaceWaves active />);
    expect(layer).toHaveAttribute('data-active', 'true');
    expect(animate).toHaveBeenCalledTimes(3);
    motions.forEach((motion) => expect(motion.play).toHaveBeenCalledTimes(2));
    view.unmount();
    motions.forEach((motion) => expect(motion.cancel).toHaveBeenCalledOnce());
  });

  it('cancels a pending pause when playback resumes during the fade', () => {
    const view = render(<MusicSurfaceWaves active />);
    view.rerender(<MusicSurfaceWaves active={false} />);
    act(() => vi.advanceTimersByTime(600));
    view.rerender(<MusicSurfaceWaves active />);
    act(() => vi.advanceTimersByTime(1500));
    motions.forEach((motion) => expect(motion.pause).not.toHaveBeenCalled());
    view.unmount();
  });

  it('joins a new trajectory to the previous endpoint without restarting a fixed loop', () => {
    const view = render(<MusicSurfaceWaves active />);
    const firstFrames = animate.mock.calls[0]![0];
    const finish = motions[0]!.onfinish;
    act(() => finish?.call({} as Animation, {} as AnimationPlaybackEvent));
    const [nextFrames, options] = animate.mock.calls[3]!;
    expect(nextFrames[0]).toEqual(firstFrames[1]);
    expect(options.duration).toBeGreaterThanOrEqual(3500);
    expect(options.duration).toBeLessThanOrEqual(7000);
    expect(options.iterations).toBeUndefined();
    expect(motions[0]!.cancel).toHaveBeenCalledOnce();
    view.unmount();
    expect(motions[3]!.cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts paused without background motion and clears a pending fade on unmount', () => {
    const view = render(<MusicSurfaceWaves active={false} />);
    motions.forEach((motion) => expect(motion.pause).toHaveBeenCalledOnce());
    view.rerender(<MusicSurfaceWaves active />);
    view.rerender(<MusicSurfaceWaves active={false} />);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    motions.forEach((motion) => expect(motion.cancel).toHaveBeenCalledOnce());
  });
});
