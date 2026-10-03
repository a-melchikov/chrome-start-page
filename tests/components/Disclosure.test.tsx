import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Disclosure } from '../../components/ui/Disclosure';

const preference = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => preference.reduce,
}));

describe('Disclosure', () => {
  it.each([false, true])(
    'preserves edits and excludes collapsed fields during rapid keyboard toggles (reduced motion: %s)',
    async (reduce) => {
      preference.reduce = reduce;
      const user = userEvent.setup();
      render(
        <Disclosure title="Дополнительные цвета">
          <input aria-label="Цвет" defaultValue="#abcdef" />
        </Disclosure>,
      );
      const trigger = screen.getByRole('button', {
        name: 'Дополнительные цвета',
      });
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      trigger.focus();
      await user.keyboard('{Enter}');
      const field = screen.getByRole('textbox', { name: 'Цвет' });
      await user.clear(field);
      await user.type(field, '#123456');
      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(field.closest('[inert]')).not.toBeNull();
      await user.keyboard('{Enter}');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('textbox', { name: 'Цвет' })).toHaveValue(
        '#123456',
      );
      await user.keyboard('{Enter}');
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    },
  );

  it('returns focus to the header when a controlled section closes around a focused field', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Disclosure title="Настройки" open>
        <input aria-label="Название" />
      </Disclosure>,
    );
    await user.click(screen.getByRole('textbox'));
    rerender(
      <Disclosure title="Настройки" open={false}>
        <input aria-label="Название" />
      </Disclosure>,
    );
    expect(screen.getByRole('button', { name: 'Настройки' })).toHaveFocus();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
