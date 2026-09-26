import { describe, expect, it } from 'vitest';

import {
  applyWidgetHistoryEntry,
  createLayoutHistoryEntry,
} from '../../components/dashboard/widget-history';
import type { WidgetConfig } from '../../storage/schema';

function markdown(id: string, content: string, x = 0): WidgetConfig {
  return {
    id,
    type: 'markdown',
    title: id,
    content,
    layout: { x, y: 0, w: 3, h: 3 },
  };
}

describe('widget history', () => {
  it('undoes layout without reverting later content edits', () => {
    const before = [markdown('note', 'old')];
    const moved = [markdown('note', 'old', 4)];
    const entry = createLayoutHistoryEntry(before, moved);
    expect(entry).not.toBeNull();
    const current = [markdown('note', 'new', 4)];

    const undone = applyWidgetHistoryEntry(current, entry!, 'undo');
    expect(undone.widgets[0]).toMatchObject({
      content: 'new',
      layout: { x: 0 },
    });
    const redone = applyWidgetHistoryEntry(
      undone.widgets,
      undone.entry,
      'redo',
    );
    expect(redone.widgets[0]).toMatchObject({
      content: 'new',
      layout: { x: 4 },
    });
  });

  it('restores deleted widgets at their original positions', () => {
    const first = markdown('first', 'one');
    const second = markdown('second', 'two', 3);
    const third = markdown('third', 'three', 6);
    const entry = {
      kind: 'remove' as const,
      items: [{ widget: second, index: 1 }],
    };
    const undone = applyWidgetHistoryEntry([first, third], entry, 'undo');
    expect(undone.widgets.map((widget) => widget.id)).toEqual([
      'first',
      'second',
      'third',
    ]);
    const redone = applyWidgetHistoryEntry(
      undone.widgets,
      undone.entry,
      'redo',
    );
    expect(redone.widgets.map((widget) => widget.id)).toEqual([
      'first',
      'third',
    ]);
  });

  it('captures edits to an inserted widget before undo so redo restores them', () => {
    const initial = markdown('note', 'initial');
    const entry = {
      kind: 'insert' as const,
      items: [{ widget: initial, index: 0 }],
    };
    const undone = applyWidgetHistoryEntry(
      [markdown('note', 'edited')],
      entry,
      'undo',
    );
    const redone = applyWidgetHistoryEntry(
      undone.widgets,
      undone.entry,
      'redo',
    );
    expect(redone.widgets[0]).toMatchObject({ id: 'note', content: 'edited' });
  });
});
