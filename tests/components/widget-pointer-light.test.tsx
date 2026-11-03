import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WidgetHost } from '../../components/dashboard/WidgetHost';
import {
  AnimationContext,
  type AnimationMode,
} from '../../components/ui/animation-preferences';
import { createMarkdownWidgetWithTemplate } from '../../widgets/markdown/templates';
import { createDefaultSearchWidget } from '../../widgets/search/defaults';

const widget = createMarkdownWidgetWithTemplate('light', 0);

function setup({
  editing = false,
  glass = true,
  light = true,
  mode = 'system' as AnimationMode,
  search = false,
} = {}) {
  return render(
    <AnimationContext.Provider value={mode}>
      <div
        className={glass ? 'liquid-glass-enabled' : ''}
        data-pointer-light-enabled={light}
      >
        <WidgetHost
          isEditing={editing}
          widget={search ? createDefaultSearchWidget('search', 0) : widget}
          onRequestDelete={vi.fn()}
        />
      </div>
    </AnimationContext.Provider>,
  );
}

function move(target: Element, pointerType = 'mouse', clientX = 120) {
  fireEvent(
    target,
    Object.assign(
      new MouseEvent('pointermove', { bubbles: true, clientX, clientY: 80 }),
      { pointerType },
    ),
  );
}

describe('widget pointer light', () => {
  let nextFrame: FrameRequestCallback | undefined;

  beforeEach(() => {
    nextFrame = undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      nextFrame = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      nextFrame = undefined;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  function frame() {
    act(() => {
      const callback = nextFrame;
      nextFrame = undefined;
      callback?.(0);
    });
  }

  it('follows the latest mouse position once per frame', () => {
    setup();
    const article = screen.getByRole('article');
    vi.spyOn(article, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      top: 30,
    } as DOMRect);
    move(article);
    move(article, 'mouse', 160);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    frame();
    expect(article).toHaveAttribute('data-pointer-light', 'true');
    expect(article.style.getPropertyValue('--pointer-light-x')).toBe('140px');
    expect(article.style.getPropertyValue('--pointer-light-y')).toBe('50px');
    fireEvent.pointerLeave(article);
    expect(article).not.toHaveAttribute('data-pointer-light');
  });

  it('lights the search surface while preserving input and focus', async () => {
    const { container } = setup({ search: true });
    const input = await screen.findByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Тест' } });
    input.focus();
    move(input);
    frame();
    expect(container.querySelector('.widget-search-surface')).toHaveAttribute(
      'data-pointer-light',
      'true',
    );
    expect(input).toHaveValue('Тест');
    expect(input).toHaveFocus();
    expect(screen.getByRole('article')).not.toHaveAttribute(
      'data-pointer-light',
    );
  });

  it.each([
    { editing: true },
    { glass: false },
    { light: false },
    { mode: 'reduced' as const },
    { mode: 'off' as const },
  ])('stays inactive for %j', (options) => {
    setup(options);
    move(screen.getByRole('article'));
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('ignores touch and pen input', () => {
    setup();
    move(screen.getByRole('article'), 'touch');
    move(screen.getByRole('article'), 'pen');
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('cancels pending work on pointer exit and unmount', () => {
    const { unmount } = setup();
    const article = screen.getByRole('article');
    move(article);
    fireEvent.pointerLeave(article);
    frame();
    expect(article).not.toHaveAttribute('data-pointer-light');
    move(article);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(2);
    expect(nextFrame).toBeUndefined();
  });
});
