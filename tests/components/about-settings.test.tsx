import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { FEATURE_GROUPS } from '../../app/features';
import { RELEASE_NOTES } from '../../app/release-notes';
import { APP_VERSION } from '../../app/version';
import { AboutSettings } from '../../components/dashboard/AboutSettings';
import {
  buildCommandCatalog,
  filterCommands,
} from '../../components/dashboard/command-catalog';
import { App } from '../../entrypoints/newtab/App';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import { getAvailableWidgetDefinitions } from '../../widgets/registry';

describe('About and feature guide', () => {
  beforeEach(() => fakeBrowser.reset());

  it('keeps the version, bundled release history and feature catalog consistent', () => {
    const features = FEATURE_GROUPS.flatMap((group) => group.features);
    const versions = RELEASE_NOTES.map((release) => release.version);
    expect(versions[0]).toBe(APP_VERSION);
    expect(RELEASE_NOTES[0]?.releasedAt).toBe('2026-11-03');
    expect(new Set(versions).size).toBe(versions.length);
    expect(new Set(features.map((feature) => feature.id)).size).toBe(
      features.length,
    );
    for (const feature of features)
      expect(versions).toContain(feature.introducedIn);
    expect(
      features
        .flatMap((feature) => (feature.widgetType ? [feature.widgetType] : []))
        .sort(),
    ).toEqual(
      getAvailableWidgetDefinitions()
        .map((widget) => widget.type)
        .sort(),
    );
    expect(RELEASE_NOTES.every((release) => release.content.length > 0)).toBe(
      true,
    );
    for (const release of RELEASE_NOTES) {
      expect(new Date(release.releasedAt).toISOString().slice(0, 10)).toBe(
        release.releasedAt,
      );
      expect(release.content).not.toMatch(
        /восстановлена по Git|готовится к выпуску|Номер установлен в коммите/,
      );
    }
  });

  it('searches instructions and combines search with the introduction version filter', async () => {
    const user = userEvent.setup();
    render(<AboutSettings />);
    expect(screen.getByText(`Версия ${APP_VERSION}`)).toBeVisible();
    const search = screen.getByRole('searchbox', {
      name: 'Поиск по возможностям',
    });
    await user.type(search, '  КОРЗИНА  ');
    expect(
      screen.getByRole('heading', { name: 'Корзина пространств' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Цифровые часы' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('combobox', { name: 'Версия появления' }),
    );
    await user.click(screen.getByRole('option', { name: '0.1.1' }));
    expect(
      screen.getByText(
        'По этим условиям ничего не найдено. Измените запрос или выберите другую версию.',
      ),
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Сбросить поиск и фильтр' }),
    );
    expect(search).toHaveValue('');
    expect(
      screen.getByRole('heading', { name: 'Цифровые часы' }),
    ).toBeVisible();

    await user.type(search, 'file:///');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Найдено возможностей: 1',
    );
    expect(
      screen.getByRole('heading', { name: 'Ссылки на локальные файлы' }),
    ).toBeVisible();
  });

  it('opens a feature release and focuses it, retaining the search when returning', async () => {
    const user = userEvent.setup();
    render(<AboutSettings />);
    await user.type(screen.getByRole('searchbox'), 'локальные файлы');
    await user.click(
      screen.getByRole('button', {
        name: 'Ссылки на локальные файлы: история версии 0.1.1',
      }),
    );
    const release = screen.getByRole('button', {
      name: 'V0.1.1',
    });
    expect(release).toHaveFocus();
    expect(release).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() =>
      expect(screen.getByText(/22 октября 2026/)).toBeVisible(),
    );
    expect(screen.queryByText(/восстановлена по Git/)).not.toBeInTheDocument();
    await user.click(release);
    expect(release).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Возможности' }));
    expect(screen.getByRole('searchbox')).toHaveValue('локальные файлы');
    expect(
      screen.getByRole('heading', { name: 'Ссылки на локальные файлы' }),
    ).toBeVisible();
  });

  it('opens from the command palette and restores focus after Escape and a remount', async () => {
    const user = userEvent.setup();
    const catalog = buildCommandCatalog(createDefaultDashboardConfig(), false);
    expect(filterCommands(catalog, 'changelog')).toContainEqual(
      expect.objectContaining({ action: 'about' }),
    );
    const view = render(<App />);
    await screen.findByRole('button', { name: 'Настройки' });
    await user.keyboard('{Control>}k{/Control}');
    const palette = await screen.findByRole('dialog', { name: 'Поиск команд' });
    await user.type(within(palette).getByRole('combobox'), 'changelog');
    await user.keyboard('{Enter}');
    const about = await screen.findByRole('tabpanel', { name: 'О приложении' });
    expect(
      await within(about).findByText(`Версия ${APP_VERSION}`),
    ).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Настройки' })).toHaveFocus(),
    );
    view.unmount();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('tab', { name: 'О приложении' }));
    expect(await screen.findByText(`Версия ${APP_VERSION}`)).toBeVisible();
  });
});
