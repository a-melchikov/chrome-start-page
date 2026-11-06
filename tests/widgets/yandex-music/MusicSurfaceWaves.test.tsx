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
    expect(motions).toHaveLength(8);
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
    expect(animate).toHaveBeenCalledTimes(8);
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

  it.each([
    { channel: 'movement', index: 0, min: 1800, max: 3600 },
    { channel: 'pulse', index: 1, min: 900, max: 1600 },
  ])(
    'joins each $channel to its previous endpoint without a fixed loop',
    ({ index, min, max }) => {
      const view = render(<MusicSurfaceWaves active />);
      const firstFrames = animate.mock.calls[index]![0];
      const finish = motions[index]!.onfinish;
      act(() => finish?.call({} as Animation, {} as AnimationPlaybackEvent));
      const [nextFrames, options] = animate.mock.calls[8]!;
      expect(nextFrames[0]).toEqual(firstFrames[1]);
      expect(options.duration).toBeGreaterThanOrEqual(min);
      expect(options.duration).toBeLessThanOrEqual(max);
      expect(options.iterations).toBeUndefined();
      expect(motions[index]!.cancel).toHaveBeenCalledOnce();
      view.unmount();
      expect(motions[8]!.cancel).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('pulses independently of movement, alternating soft bright and dim targets', () => {
    const view = render(<MusicSurfaceWaves active />);
    for (let index = 0; index < 8; index += 2) {
      const [movement] = animate.mock.calls[index]!;
      const [pulse] = animate.mock.calls[index + 1]!;
      movement.forEach((frame) =>
        expect(Object.keys(frame)).toEqual(['transform']),
      );
      pulse.forEach((frame) => expect(Object.keys(frame)).toEqual(['opacity']));
      const change = Number(pulse[1]!.opacity) - Number(pulse[0]!.opacity);
      expect(index % 4 === 0 ? change : -change).toBeGreaterThan(0);
    }
    act(() =>
      motions[1]!.onfinish?.call({} as Animation, {} as AnimationPlaybackEvent),
    );
    const [dim] = animate.mock.calls[8]!;
    expect(Number(dim[1]!.opacity)).toBeLessThan(Number(dim[0]!.opacity));
    expect(Number(dim[1]!.opacity)).toBeGreaterThanOrEqual(0.18);
    view.unmount();
  });

  it('keeps ribbon gradients separate for multiple music widgets', () => {
    const view = render(
      <>
        <MusicSurfaceWaves active />
        <MusicSurfaceWaves active />
      </>,
    );
    const gradients = [...view.container.querySelectorAll('linearGradient')];
    expect(gradients).toHaveLength(8);
    expect(new Set(gradients.map((gradient) => gradient.id)).size).toBe(8);
    view.container.querySelectorAll('path').forEach((path, index) => {
      expect(path).toHaveAttribute('fill', `url(#${gradients[index]!.id})`);
    });
    view.unmount();
  });

  it('unmounts safely when Web Animations API is unavailable', () => {
    Reflect.deleteProperty(Element.prototype, 'animate');
    const view = render(<MusicSurfaceWaves active />);
    view.rerender(<MusicSurfaceWaves active={false} />);
    view.unmount();
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
