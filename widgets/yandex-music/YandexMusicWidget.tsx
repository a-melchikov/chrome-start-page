import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import {
  ForwardIcon,
  ExternalLinkIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  PreviousTrackIcon,
  SlidersIcon,
  VolumeIcon,
  VolumeOffIcon,
  HeartIcon,
  HeartOffIcon,
} from '../../components/icons';
import { Button, Dialog, IconButton, Select } from '../../components/ui';
import { musicClient, useMusicPlayer } from './client';
import { MUSIC_ORIGIN, type MusicCommand, type MusicPlayer } from './types';
import type { WidgetRenderProps } from '../registry';
import type { YandexMusicWidgetConfig } from './types';
import { useAnimationPreferences } from '../../components/ui/animation-preferences';
import { MusicSurfaceWaves } from './MusicSurfaceWaves';
import './yandex-music.css';

function formatTime(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function PlayerRange({
  label,
  value,
  max,
  step = 1,
  disabled,
  busy,
  onCommit,
  timeline = false,
  vertical = false,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  disabled: boolean;
  busy: boolean;
  onCommit: (value: number) => void;
  timeline?: boolean;
  vertical?: boolean;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const pending = useRef<number | null>(null);
  const commit = () => {
    const next = pending.current;
    pending.current = null;
    setDraft(null);
    if (next !== null && !disabled && !busy) onCommit(next);
  };
  const input = (
    <input
      aria-label={label}
      aria-valuetext={
        label === 'Позиция трека'
          ? formatTime(draft ?? value)
          : `${Math.round((draft ?? value) * 100)}%`
      }
      className={`music-player-range${vertical ? ' music-player-range--vertical' : ''}`}
      aria-orientation={vertical ? 'vertical' : undefined}
      style={
        {
          '--music-range-fill': `${((draft ?? value) / (max || 1)) * 100}%`,
        } as CSSProperties
      }
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
  return timeline ? (
    <div
      className="music-player-timeline"
      style={
        {
          '--music-range-fill': `${((draft ?? value) / (max || 1)) * 100}%`,
        } as CSSProperties
      }
    >
      <span aria-hidden="true">
        {formatTime(draft ?? value)} / {formatTime(max)}
      </span>
      {input}
    </div>
  ) : (
    input
  );
}

function VolumeControl({
  player,
  busy,
  onCommit,
  onToggleMute,
}: {
  player: MusicPlayer;
  busy: boolean;
  onCommit: (value: number) => void;
  onToggleMute: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  const closePopup = () => {
    if (root.current?.contains(document.activeElement))
      trigger.current?.focus();
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return (
    <div
      ref={root}
      className="music-player-volume"
      data-no-drag
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setOpen(true);
      }}
      onPointerLeave={closePopup}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          closePopup();
        }
      }}
    >
      <IconButton
        ref={trigger}
        aria-label={player.volume === 0 ? 'Включить звук' : 'Выключить звук'}
        title={
          !player.capabilities.volume
            ? 'Громкость недоступна для текущего трека'
            : `${player.volume === 0 ? 'Включить звук' : 'Выключить звук'} (${Math.round(player.volume * 100)}%)`
        }
        aria-expanded={open}
        aria-controls={popupId}
        variant="ghost"
        size="small"
        className="music-player-volume-trigger"
        disabled={!player.capabilities.volume}
        aria-disabled={busy || !player.capabilities.volume}
        onClick={onToggleMute}
      >
        {player.volume === 0 ? (
          <VolumeOffIcon className="size-4" />
        ) : (
          <VolumeIcon className="size-4" />
        )}
      </IconButton>
      <div
        id={popupId}
        className="music-player-volume-popover"
        role="group"
        aria-label="Управление громкостью"
        hidden={!open}
      >
        <PlayerRange
          label="Громкость"
          vertical
          value={player.volume}
          max={1}
          step={0.01}
          disabled={!player.capabilities.volume}
          busy={busy}
          onCommit={onCommit}
        />
      </div>
    </div>
  );
}

function ReactionButton({
  type,
  selected,
  available,
  busy,
  onClick,
}: {
  type: 'like' | 'dislike';
  selected?: boolean;
  available?: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const label = type === 'like' ? 'Нравится' : 'Не нравится';
  return (
    <IconButton
      className="music-player-reaction"
      data-reaction={type}
      aria-label={label}
      aria-pressed={selected === true}
      title={
        !available
          ? 'Недоступно для текущего трека'
          : selected
            ? type === 'like'
              ? 'Убрать лайк'
              : 'Убрать дизлайк'
            : label
      }
      variant="ghost"
      size="small"
      disabled={!available}
      aria-disabled={busy || !available}
      onClick={onClick}
    >
      {type === 'like' ? (
        <HeartIcon className="size-4" />
      ) : (
        <HeartOffIcon className="size-4" />
      )}
    </IconButton>
  );
}

function Player({
  player,
  busy,
  waves,
  onToggleMute,
}: {
  player: MusicPlayer;
  busy: boolean;
  waves: boolean;
  onToggleMute: () => void;
}) {
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const artwork = player.artwork !== failedArtwork ? player.artwork : null;
  const send = (command: MusicCommand) => {
    if (busy) return;
    void musicClient.command(command);
  };
  return (
    <div className="music-player-body" data-artwork={!!artwork}>
      <div className="music-player-artwork">
        {artwork ? (
          <img
            src={artwork}
            alt=""
            draggable={false}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailedArtwork(artwork)}
          />
        ) : (
          <MusicIcon className="size-8 text-theme-text-secondary" />
        )}
        {artwork && waves ? (
          <MusicSurfaceWaves active={player.playing} />
        ) : null}
      </div>
      <div className="music-player-panel">
        <div className="music-player-track">
          <p className="music-player-title" title={player.title}>
            {player.title}
          </p>
          {player.artist ? (
            <p className="music-player-artist" title={player.artist}>
              {player.artist}
            </p>
          ) : null}
        </div>
        <div className="music-player-controls">
          <div className="music-player-footer">
            <VolumeControl
              player={player}
              busy={busy}
              onToggleMute={onToggleMute}
              onCommit={(value) => send({ type: 'volume', value })}
            />
            <ReactionButton
              type="dislike"
              selected={player.disliked}
              available={player.capabilities.dislike}
              busy={busy}
              onClick={() => send({ type: 'dislike', value: !player.disliked })}
            />
            <PlayerRange
              label="Позиция трека"
              timeline
              value={player.position}
              max={player.duration}
              disabled={!player.capabilities.seek}
              busy={busy}
              onCommit={(value) => send({ type: 'seek', value })}
            />
            <ReactionButton
              type="like"
              selected={player.liked}
              available={player.capabilities.like}
              busy={busy}
              onClick={() => send({ type: 'like', value: !player.liked })}
            />
          </div>
          <div className="music-player-transport">
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
              <PreviousTrackIcon className="music-track-skip size-5" />
            </IconButton>
            <IconButton
              className="music-player-toggle"
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
              <ForwardIcon className="music-track-skip size-5" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function YandexMusicWidget({
  config,
  onChange,
  headerActionsTarget,
}: WidgetRenderProps<YandexMusicWidgetConfig>) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => document.visibilityState !== 'hidden',
  );
  const [layout, setLayout] = useState<'square' | 'wide' | 'tall'>('square');
  const { reduced } = useAnimationPreferences();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { state, busy, initializing, error, notice } = useMusicPlayer(
    pageVisible && (visible || settingsOpen),
  );
  const isWeb = state.status === 'unsupported';
  const permissionRequired = state.status === 'permission-required';
  const connected = !isWeb && !permissionRequired;
  const lastAudibleVolume = useRef<{ sourceId: number | null; value: number }>({
    sourceId: null,
    value: 0.5,
  });
  const volume = state.player?.volume;
  useEffect(() => {
    if (lastAudibleVolume.current.sourceId !== state.sourceId) {
      lastAudibleVolume.current = { sourceId: state.sourceId, value: 0.5 };
    }
    if (volume !== undefined && volume > 0)
      lastAudibleVolume.current.value = volume;
  }, [state.sourceId, volume]);
  const toggleMute = () => {
    if (busy || !state.player?.capabilities.volume) return;
    const current = state.player.volume;
    if (current > 0) lastAudibleVolume.current.value = current;
    void musicClient.command({
      type: 'volume',
      value: current > 0 ? 0 : lastAudibleVolume.current.value,
    });
  };

  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      setVisible(entries.some((entry) => entry.isIntersecting));
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (!root.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || !entry.contentRect.height) return;
      const ratio = entry.contentRect.width / entry.contentRect.height;
      setLayout(ratio < 0.8 ? 'tall' : ratio > 1.25 ? 'wide' : 'square');
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
    <div
      className="music-widget h-full min-h-0"
      data-layout={layout}
      ref={root}
    >
      {headerActionsTarget ? (
        createPortal(actions, headerActionsTarget)
      ) : (
        <div className="music-widget-actions">{actions}</div>
      )}
      <div className="music-widget-content">
        {initializing ? (
          <p
            role="status"
            className="music-widget-empty text-sm text-theme-text-secondary"
          >
            Подключение к Музыке…
          </p>
        ) : state.status === 'ready' && state.player ? (
          <Player
            key={state.player.trackKey}
            player={state.player}
            busy={busy}
            onToggleMute={toggleMute}
            waves={
              config.surfaceWaves === true && visible && pageVisible && !reduced
            }
          />
        ) : (
          <div className="music-widget-empty gap-3">
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
        title="Настройки Яндекс.Музыки"
        size="compact"
      >
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
            <span>
              Волны на обложке
              <span className="mt-1 block text-xs text-theme-text-secondary">
                Декоративная анимация во время воспроизведения.
              </span>
            </span>
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-theme-accent"
              checked={config.surfaceWaves === true}
              disabled={!onChange}
              onChange={(event) =>
                onChange?.({ ...config, surfaceWaves: event.target.checked })
              }
            />
          </label>
          <p className="text-sm text-theme-text-secondary">
            Музыка играет в отдельной вкладке. У вас должна быть открыта вкладка
            с Яндекс.Музыкой.
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
                  <option value="auto">Авто</option>
                  {state.sources.map((source, index) => (
                    <option key={source.id} value={String(source.id)}>
                      {index + 1}. {source.label}
                      {source.playing ? ' · играет' : ''}
                    </option>
                  ))}
                </Select>
              </label>
              {state.sourceId === null ? (
                <p className="text-xs text-theme-text-secondary" role="status">
                  Вкладки Музыки не найдены
                </p>
              ) : null}
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
