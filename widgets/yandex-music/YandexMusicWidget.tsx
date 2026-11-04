import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  ForwardIcon,
  ExternalLinkIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  PreviousTrackIcon,
  SlidersIcon,
} from '../../components/icons';
import { Button, Dialog, IconButton, Select } from '../../components/ui';
import { musicClient, useMusicPlayer } from './client';
import { MUSIC_ORIGIN, type MusicCommand, type MusicPlayer } from './types';
import './yandex-music.css';

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function PlayerRange({
  label,
  value,
  max,
  step = 1,
  disabled,
  busy,
  onCommit,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  disabled: boolean;
  busy: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const pending = useRef<number | null>(null);
  const commit = () => {
    const next = pending.current;
    pending.current = null;
    setDraft(null);
    if (next !== null && !disabled && !busy) onCommit(next);
  };
  return (
    <input
      aria-label={label}
      aria-valuetext={
        label === 'Позиция трека'
          ? formatTime(draft ?? value)
          : `${Math.round((draft ?? value) * 100)}%`
      }
      className="music-player-range"
      type="range"
      min={0}
      max={max || 1}
      step={step}
      value={draft ?? value}
      disabled={disabled}
      aria-disabled={disabled || busy}
      aria-busy={busy}
      title={disabled ? 'Недоступно для текущего трека' : label}
      onChange={(event) => {
        if (busy) return;
        pending.current = Number(event.target.value);
        setDraft(pending.current);
      }}
      onPointerUp={commit}
      onKeyUp={commit}
      onBlur={commit}
      onPointerCancel={() => {
        pending.current = null;
        setDraft(null);
      }}
    />
  );
}

function Player({ player, busy }: { player: MusicPlayer; busy: boolean }) {
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const artwork = player.artwork !== failedArtwork ? player.artwork : null;
  const send = (command: MusicCommand) => {
    if (busy) return;
    void musicClient.command(command);
  };
  return (
    <div className="music-player-body">
      <div className="music-player-artwork">
        {artwork ? (
          <img
            src={artwork}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailedArtwork(artwork)}
          />
        ) : (
          <MusicIcon className="size-8 text-theme-text-secondary" />
        )}
      </div>
      <div className="music-player-track">
        <p
          className="break-words text-sm font-semibold text-theme-text-primary"
          title={player.title}
        >
          {player.title}
        </p>
        <p className="mt-1 break-words text-xs text-theme-text-secondary">
          {player.artist || 'Исполнитель не указан'}
        </p>
      </div>
      <div className="music-player-controls">
        <div className="flex items-center justify-center gap-3">
          <IconButton
            aria-label="Предыдущий трек"
            title={
              player.capabilities.previous
                ? 'Предыдущий трек'
                : 'Предыдущий трек недоступен'
            }
            variant="ghost"
            size="small"
            disabled={!player.capabilities.previous}
            aria-disabled={busy || !player.capabilities.previous}
            onClick={() => send({ type: 'previous' })}
          >
            <PreviousTrackIcon className="size-5" />
          </IconButton>
          <IconButton
            aria-label={player.playing ? 'Пауза' : 'Воспроизвести'}
            title={player.playing ? 'Пауза' : 'Воспроизвести'}
            size="small"
            disabled={!player.capabilities[player.playing ? 'pause' : 'play']}
            aria-disabled={
              busy || !player.capabilities[player.playing ? 'pause' : 'play']
            }
            onClick={() => send({ type: player.playing ? 'pause' : 'play' })}
          >
            {player.playing ? (
              <PauseIcon className="size-5" />
            ) : (
              <PlayIcon className="size-5" />
            )}
          </IconButton>
          <IconButton
            aria-label="Следующий трек"
            title={
              player.capabilities.next
                ? 'Следующий трек'
                : 'Следующий трек недоступен'
            }
            variant="ghost"
            size="small"
            disabled={!player.capabilities.next}
            aria-disabled={busy || !player.capabilities.next}
            onClick={() => send({ type: 'next' })}
          >
            <ForwardIcon className="size-5" />
          </IconButton>
        </div>
        <div>
          <PlayerRange
            label="Позиция трека"
            value={player.position}
            max={player.duration}
            disabled={!player.capabilities.seek}
            busy={busy}
            onCommit={(value) => send({ type: 'seek', value })}
          />
          <div className="flex justify-between text-xs tabular-nums text-theme-text-secondary">
            <span>{formatTime(player.position)}</span>
            <span>{formatTime(player.duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-theme-text-secondary">Громкость</span>
          <PlayerRange
            label="Громкость"
            value={player.volume}
            max={1}
            step={0.01}
            disabled={!player.capabilities.volume}
            busy={busy}
            onCommit={(value) => send({ type: 'volume', value })}
          />
        </div>
      </div>
    </div>
  );
}

export function YandexMusicWidget({
  headerActionsTarget,
}: {
  headerActionsTarget?: HTMLElement | null;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { state, busy, initializing, error, notice } = useMusicPlayer(
    visible || settingsOpen,
  );
  const isWeb = state.status === 'unsupported';
  const permissionRequired = state.status === 'permission-required';
  const connected = !isWeb && !permissionRequired;

  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      setVisible(entries.some((entry) => entry.isIntersecting));
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  const actions = !isWeb ? (
    <>
      <IconButton
        aria-label="Открыть Яндекс.Музыку"
        title="Открыть Яндекс.Музыку"
        size="xs"
        variant="ghost"
        disabled={busy}
        onClick={() => {
          void musicClient.open();
        }}
      >
        <ExternalLinkIcon className="size-4" />
      </IconButton>
      <IconButton
        aria-label="Подключение Яндекс.Музыки"
        title="Подключение и источник"
        size="xs"
        variant="ghost"
        onClick={() => setSettingsOpen(true)}
      >
        <SlidersIcon className="size-4" />
      </IconButton>
    </>
  ) : null;

  return (
    <div className="music-widget h-full min-h-0" data-no-drag ref={root}>
      {headerActionsTarget ? (
        createPortal(actions, headerActionsTarget)
      ) : (
        <div className="flex justify-end">{actions}</div>
      )}
      <div className="music-widget-content">
        {initializing ? (
          <p role="status" className="text-sm text-theme-text-secondary">
            Подключение к Музыке…
          </p>
        ) : state.status === 'ready' && state.player ? (
          <Player
            key={state.player.trackKey}
            player={state.player}
            busy={busy}
          />
        ) : (
          <div className="flex min-h-full flex-col items-start justify-center gap-3">
            <MusicIcon className="size-7 text-theme-text-secondary" />
            <p className="text-sm text-theme-text-primary">
              {isWeb
                ? 'Управление доступно в расширении'
                : permissionRequired
                  ? 'Подключите Яндекс.Музыку'
                  : state.status === 'no-tabs'
                    ? 'Откройте Музыку, чтобы управлять воспроизведением'
                    : state.status === 'no-track'
                      ? 'Выберите музыку в Яндекс.Музыке'
                      : 'Нет связи с плеером'}
            </p>
            {isWeb ? (
              <a
                className="text-sm text-theme-accent underline underline-offset-4"
                href={MUSIC_ORIGIN}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть Яндекс.Музыку
              </a>
            ) : (
              <Button
                size="small"
                disabled={busy}
                onClick={() => {
                  void (permissionRequired || state.status === 'unavailable'
                    ? musicClient.connect()
                    : musicClient.open());
                }}
              >
                {permissionRequired
                  ? 'Подключить'
                  : state.status === 'unavailable'
                    ? 'Повторить подключение'
                    : 'Открыть Яндекс.Музыку'}
              </Button>
            )}
          </div>
        )}
        {notice ? (
          <p className="mt-2 text-xs text-theme-text-secondary" role="status">
            {notice}
          </p>
        ) : null}
        {error || state.error ? (
          <p className="mt-2 text-xs text-theme-danger" role="alert">
            {error || state.error}
          </p>
        ) : null}
      </div>
      <Dialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Подключение Яндекс.Музыки"
        size="compact"
      >
        <div className="space-y-4">
          <p className="text-sm text-theme-text-secondary">
            Музыка играет в отдельной вкладке. Все виджеты используют один
            источник.
          </p>
          {permissionRequired ? (
            <Button
              disabled={busy}
              onClick={() => {
                void musicClient.connect();
              }}
            >
              Подключить Яндекс.Музыку
            </Button>
          ) : null}
          {connected ? (
            <>
              <label className="block space-y-2 text-sm">
                <span>Источник воспроизведения</span>
                <Select
                  aria-label="Источник воспроизведения"
                  value={
                    state.selection.mode === 'auto'
                      ? 'auto'
                      : String(state.selection.tabId)
                  }
                  disabled={busy}
                  onValueChange={(value) => {
                    void musicClient.select(
                      value === 'auto'
                        ? { mode: 'auto' }
                        : { mode: 'manual', tabId: Number(value) },
                    );
                  }}
                >
                  <option value="auto">
                    Авто — играющая или последняя активная вкладка
                  </option>
                  {state.sources.map((source, index) => (
                    <option key={source.id} value={String(source.id)}>
                      {index + 1}. {source.label}
                      {source.playing ? ' · играет' : ''}
                    </option>
                  ))}
                </Select>
              </label>
              <p className="text-xs text-theme-text-secondary" role="status">
                {state.sourceId === null
                  ? 'Вкладки Музыки не найдены'
                  : `Текущий источник: ${state.sources.find((source) => source.id === state.sourceId)?.label ?? 'Яндекс.Музыка'}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  disabled={busy}
                  onClick={() => {
                    void musicClient.open();
                  }}
                >
                  Открыть Музыку
                </Button>
                <Button
                  variant="danger-ghost"
                  size="small"
                  disabled={busy}
                  onClick={() => {
                    void musicClient.disconnect();
                  }}
                >
                  Отключить доступ
                </Button>
              </div>
            </>
          ) : null}
          {error || state.error ? (
            <p role="alert" className="text-sm text-theme-danger">
              {error || state.error}
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
