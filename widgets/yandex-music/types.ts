import type { BaseWidgetConfig } from '../types';

export type YandexMusicWidgetConfig = BaseWidgetConfig<'yandex-music'>;

export const MUSIC_ORIGIN = 'https://music.yandex.ru';
export const MUSIC_MATCH = `${MUSIC_ORIGIN}/*`;
export const MUSIC_SCRIPT_ID = 'yandex-music-player';
export const MUSIC_SCRIPT_FILE = '/yandex-music.js';

export type MusicCommand =
  | { type: 'play' | 'pause' | 'previous' | 'next' }
  | { type: 'seek' | 'volume'; value: number };

export interface MusicPlayer {
  title: string;
  artist: string;
  artwork: string | null;
  trackKey: string;
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  capabilities: Record<MusicCommand['type'], boolean>;
}

export type MusicSelection =
  { mode: 'auto' } | { mode: 'manual'; tabId: number };

export interface MusicSource {
  id: number;
  label: string;
  playing: boolean;
}

export interface MusicState {
  status:
    | 'unsupported'
    | 'permission-required'
    | 'no-tabs'
    | 'ready'
    | 'no-track'
    | 'unavailable';
  selection: MusicSelection;
  sources: MusicSource[];
  sourceId: number | null;
  player: MusicPlayer | null;
  error: string | null;
}

export type MusicRequest =
  | {
      type: 'yandex-music';
      action: 'state' | 'open' | 'disconnect' | 'changed';
    }
  | { type: 'yandex-music'; action: 'select'; selection: MusicSelection }
  | {
      type: 'yandex-music';
      action: 'command';
      sourceId: number;
      command: MusicCommand;
    };

export type MusicContentRequest =
  | { type: 'yandex-music:content'; action: 'read' }
  | { type: 'yandex-music:content'; action: 'stop' }
  | { type: 'yandex-music:content'; action: 'command'; command: MusicCommand };

export interface MusicContentReply {
  player: MusicPlayer | null;
  error: string | null;
}

export function emptyMusicState(status: MusicState['status']): MusicState {
  return {
    status,
    selection: { mode: 'auto' },
    sources: [],
    sourceId: null,
    player: null,
    error: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown, max = 512): value is string {
  return typeof value === 'string' && value.length <= max;
}

function isNumber(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

export function isMusicTabId(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0;
}

export function isMusicUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.origin === MUSIC_ORIGIN && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function safeArtwork(value: unknown): string | null {
  if (!isText(value, 2048)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function isMusicSelection(value: unknown): value is MusicSelection {
  return (
    isRecord(value) &&
    (value.mode === 'auto' ||
      (value.mode === 'manual' && isMusicTabId(value.tabId)))
  );
}

export function isMusicCommand(value: unknown): value is MusicCommand {
  if (!isRecord(value)) return false;
  if (['play', 'pause', 'previous', 'next'].includes(String(value.type)))
    return true;
  if (value.type === 'volume') return isNumber(value.value, 0, 1);
  return value.type === 'seek' && isNumber(value.value, 0, 604800);
}

export function isMusicPlayer(value: unknown): value is MusicPlayer {
  if (!isRecord(value) || !isRecord(value.capabilities)) return false;
  const capabilities = value.capabilities;
  return (
    isRecord(value) &&
    isText(value.title) &&
    isText(value.artist) &&
    isText(value.trackKey, 3072) &&
    (value.artwork === null ||
      (typeof value.artwork === 'string' &&
        safeArtwork(value.artwork) === value.artwork)) &&
    typeof value.playing === 'boolean' &&
    isNumber(value.position, 0, 604800) &&
    isNumber(value.duration, 0, 604800) &&
    isNumber(value.volume, 0, 1) &&
    ['play', 'pause', 'previous', 'next', 'seek', 'volume'].every(
      (key) => typeof capabilities[key] === 'boolean',
    )
  );
}

export function isMusicRequest(value: unknown): value is MusicRequest {
  if (!isRecord(value) || value.type !== 'yandex-music') return false;
  if (['state', 'open', 'disconnect', 'changed'].includes(String(value.action)))
    return true;
  if (value.action === 'select') return isMusicSelection(value.selection);
  return (
    value.action === 'command' &&
    isMusicTabId(value.sourceId) &&
    isMusicCommand(value.command)
  );
}

export function isMusicContentRequest(
  value: unknown,
): value is MusicContentRequest {
  return (
    isRecord(value) &&
    value.type === 'yandex-music:content' &&
    (value.action === 'read' ||
      value.action === 'stop' ||
      (value.action === 'command' && isMusicCommand(value.command)))
  );
}

export function isMusicContentReply(
  value: unknown,
): value is MusicContentReply {
  return (
    isRecord(value) &&
    (value.player === null || isMusicPlayer(value.player)) &&
    (value.error === null || isText(value.error))
  );
}

export function isMusicState(value: unknown): value is MusicState {
  return (
    isRecord(value) &&
    [
      'unsupported',
      'permission-required',
      'no-tabs',
      'ready',
      'no-track',
      'unavailable',
    ].includes(String(value.status)) &&
    isMusicSelection(value.selection) &&
    (value.sourceId === null || isMusicTabId(value.sourceId)) &&
    (value.player === null || isMusicPlayer(value.player)) &&
    (value.error === null || isText(value.error)) &&
    Array.isArray(value.sources) &&
    value.sources.length <= 1000 &&
    value.sources.every(
      (source) =>
        isRecord(source) &&
        isMusicTabId(source.id) &&
        isText(source.label) &&
        typeof source.playing === 'boolean',
    )
  );
}
