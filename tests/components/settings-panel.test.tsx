import { useState } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import {
  SettingsPanel,
  type SettingsSection,
} from '../../components/dashboard/SettingsPanel';
import { App } from '../../entrypoints/newtab/App';
import { DASHBOARD_STORAGE_KEY } from '../../storage/dashboard-storage';
import type { DashboardConfig } from '../../storage/schema';

async function chooseSection(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole('tab', { name }));
}

describe('Shared settings panel', () => {
  beforeEach(() => fakeBrowser.reset());

  it('keeps one dialog across every section and restores the original opener', async () => {
    const user = userEvent.setup();
    render(<App />);
    const opener = await screen.findByRole('button', {
      name: 'Настройки',
    });
    await user.click(opener);
    const panel = await screen.findByRole('dialog', { name: 'Настройки' });
    expect(screen.getByRole('tab', { selected: true })).toHaveFocus();
    for (const name of [
      'Интерфейс',
      'Пространства',
      'Резервные копии',
      'Горячие клавиши',
      'Оформление',
    ]) {
      await chooseSection(user, name);
      expect(await screen.findByRole('tabpanel', { name })).toBeVisible();
      expect(screen.getByRole('dialog', { name: 'Настройки' })).toBe(panel);
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(within(panel).getAllByText(name)).toHaveLength(1);
      expect(screen.getByRole('tab', { selected: true })).toHaveFocus();
    }
    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
    expect(panel).not.toHaveAttribute('open');
  });

  it.each([
    ['b', 'Резервные копии'],
    ['?', 'Горячие клавиши'],
    ['[F1]', 'Горячие клавиши'],
  ] as const)(
    'opens the requested section directly with %s',
    async (key, name) => {
      const user = userEvent.setup();
      render(<App />);
      await screen.findByRole('button', { name: 'Настройки' });
      await user.keyboard(key);
      expect(await screen.findByRole('tabpanel', { name })).toBeVisible();
      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
        name,
      );
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );

  it('navigates visible tabs with the keyboard and skips unavailable sections', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    function Harness() {
      const [section, setSection] = useState<SettingsSection>('appearance');
      return (
        <SettingsPanel
          open
          section={section}
          onOpenChange={() => {}}
          disabledSections={['interface', 'backup']}
          onSectionChange={(next) => {
            onSectionChange(next);
            setSection(next);
          }}
        >
          Содержимое
        </SettingsPanel>
      );
    }
    render(<Harness />);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Интерфейс' })).toBeDisabled();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Пространства' })).toHaveFocus();
    expect(
      screen.getByRole('tabpanel', { name: 'Пространства' }),
    ).toBeVisible();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Горячие клавиши' })).toHaveFocus();
    await user.keyboard('{Home}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Горячие клавиши' })).toHaveFocus();
    expect(onSectionChange).not.toHaveBeenCalledWith('interface');
    expect(onSectionChange).not.toHaveBeenCalledWith('backup');
  });

  it('persists a pending appearance preview when leaving its section', async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    fireEvent.change(
      await screen.findByRole('slider', { name: 'Скругление углов' }),
      { target: { value: '27' } },
    );
    await chooseSection(user, 'Резервные копии');
    await waitFor(async () => {
      const saved = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(saved?.workspaces[0]?.appearance.widgetBorderRadius).toBe(27);
    });
    view.unmount();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    expect(
      await screen.findByRole('slider', { name: 'Скругление углов' }),
    ).toHaveValue('27');
  });

  it('cancels an inline rename with Escape while keeping the panel open', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await chooseSection(user, 'Пространства');
    const rename = screen.getAllByRole('button', {
      name: 'Переименовать пространство',
    })[0]!;
    await user.click(rename);
    const input = screen.getByRole('textbox', {
      name: 'Название пространства',
    });
    await user.clear(input);
    await user.type(input, 'Не сохранять{Escape}');
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toHaveAttribute(
      'open',
    );
    expect(screen.getByRole('button', { name: 'Основной' })).toBeVisible();
    await waitFor(() => expect(rename).toHaveFocus());
    expect(
      screen.queryByRole('button', { name: 'Не сохранять' }),
    ).not.toBeInTheDocument();
  });

  it('dismisses a workspace deletion confirmation without closing the panel', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await chooseSection(user, 'Пространства');
    const remove = screen.getAllByRole('button', {
      name: 'Удалить пространство',
    })[1]!;
    await user.click(remove);
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    expect(
      screen.getByRole('tabpanel', { name: 'Пространства' }),
    ).toBeVisible();
    expect(remove).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Работа' })).toBeVisible();
  });
});
