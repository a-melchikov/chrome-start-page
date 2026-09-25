import { useMemo } from 'react';

import { getWeatherConditionInfo } from './weather-utils';

interface WeatherVisualEffectsProps {
  code: number | null | undefined;
  isDay: boolean;
  windSpeed: number | null | undefined;
  windDirection: number | null | undefined;
  rain: number | null | undefined;
  snowfall: number | null | undefined;
}

export function WeatherVisualEffects({
  code,
  isDay,
  windSpeed = 2,
  windDirection = 180,
  rain = 0,
  snowfall = 0,
}: WeatherVisualEffectsProps) {
  const { category } = getWeatherConditionInfo(code);

  const { tiltDeg, driftDurationSec } = useMemo(() => {
    const speed = windSpeed ?? 2;
    const dir = windDirection ?? 180;
    const rad = (dir * Math.PI) / 180;
    const rawTilt = Math.sin(rad) * Math.min(speed * 1.8, 22);
    const duration = Math.max(12, Math.round(40 - Math.min(speed * 2, 25)));
    return {
      tiltDeg: Math.round(rawTilt),
      driftDurationSec: duration,
    };
  }, [windSpeed, windDirection]);

  const rainCount = useMemo(() => {
    if (category !== 'rain' && category !== 'thunder') return 0;
    const totalRain = rain ?? 0;
    if (totalRain > 5 || code === 65 || code === 82) return 14;
    if (totalRain > 1 || code === 63 || code === 81) return 10;
    return 7;
  }, [category, rain, code]);

  const snowCount = useMemo(() => {
    if (category !== 'snow') return 0;
    const totalSnow = snowfall ?? 0;
    if (totalSnow > 3 || code === 75 || code === 86) return 14;
    return 8;
  }, [category, snowfall, code]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none rounded-xl"
    >
      <style>{`
        @keyframes weather-pulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes weather-cloud-drift-1 {
          0% { transform: translateX(-15%); }
          50% { transform: translateX(12%); }
          100% { transform: translateX(-15%); }
        }
        @keyframes weather-cloud-drift-2 {
          0% { transform: translateX(10%); }
          50% { transform: translateX(-12%); }
          100% { transform: translateX(10%); }
        }
        @keyframes weather-fall {
          0% { transform: translateY(-30px); opacity: 0; }
          15% { opacity: 0.8; }
          85% { opacity: 0.8; }
          100% { transform: translateY(280px); opacity: 0; }
        }
        @keyframes weather-fog-float {
          0%, 100% { opacity: 0.25; transform: translateX(-5%); }
          50% { opacity: 0.45; transform: translateX(5%); }
        }
        @keyframes weather-flash {
          0%, 88%, 93%, 100% { opacity: 0; }
          90%, 92% { opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .weather-animated {
            animation: none !important;
          }
        }
      `}</style>

      {/* Sky Ambient Tint */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isDay
            ? category === 'thunder'
              ? 'bg-slate-900/35'
              : category === 'cloudy' || category === 'fog'
                ? 'bg-sky-900/10'
                : 'bg-amber-400/5'
            : category === 'thunder'
              ? 'bg-slate-950/60'
              : 'bg-indigo-950/25'
        }`}
      />

      {/* Celestial Body: Sun or Moon */}
      {(category === 'clear' || category === 'cloudy') && (
        <div className="absolute -top-4 -right-4 size-32 opacity-75">
          {isDay ? (
            <div
              className="weather-animated size-full rounded-full bg-gradient-to-br from-amber-300/40 via-amber-400/20 to-transparent blur-xl"
              style={{ animation: 'weather-pulse 6s ease-in-out infinite' }}
            />
          ) : (
            <div
              className="weather-animated size-full rounded-full bg-gradient-to-br from-blue-200/30 via-indigo-300/15 to-transparent blur-xl"
              style={{ animation: 'weather-pulse 7s ease-in-out infinite' }}
            />
          )}
        </div>
      )}

      {/* Cloud Layers */}
      {(category === 'cloudy' ||
        category === 'rain' ||
        category === 'snow' ||
        category === 'thunder') && (
        <div className="absolute inset-0 opacity-25">
          {/* Cloud 1 */}
          <div
            className="weather-animated absolute -top-8 -left-10 h-28 w-64 rounded-full bg-theme-text-muted/30 blur-2xl"
            style={{
              animation: `weather-cloud-drift-1 ${driftDurationSec}s ease-in-out infinite`,
            }}
          />
          {/* Cloud 2 */}
          <div
            className="weather-animated absolute top-4 -right-12 h-24 w-56 rounded-full bg-theme-text-muted/20 blur-xl"
            style={{
              animation: `weather-cloud-drift-2 ${Math.round(
                driftDurationSec * 1.25,
              )}s ease-in-out infinite`,
            }}
          />
        </div>
      )}

      {/* Fog Layers */}
      {category === 'fog' && (
        <div className="absolute inset-0 flex flex-col justify-around py-4">
          <div
            className="weather-animated h-10 w-full bg-gradient-to-r from-transparent via-slate-300/30 to-transparent blur-md"
            style={{ animation: 'weather-fog-float 7s ease-in-out infinite' }}
          />
          <div
            className="weather-animated h-8 w-full bg-gradient-to-r from-transparent via-slate-300/20 to-transparent blur-md"
            style={{ animation: 'weather-fog-float 9s ease-in-out infinite' }}
          />
        </div>
      )}

      {/* Rain Streaks */}
      {rainCount > 0 && (
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${tiltDeg}deg)` }}
        >
          {Array.from({ length: rainCount }, (_, index) => {
            const leftPct = ((index * 7 + 5) % 90) + 5;
            const duration = 0.7 + (index % 5) * 0.12;
            const delay = (index * 0.17) % 1.2;
            const height = 16 + (index % 4) * 6;

            return (
              <span
                key={index}
                className="weather-animated absolute w-[1.5px] rounded-full bg-blue-400/60 dark:bg-blue-300/60"
                style={{
                  left: `${leftPct}%`,
                  top: '-20px',
                  height: `${height}px`,
                  animation: `weather-fall ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Snow Flakes */}
      {snowCount > 0 && (
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${Math.round(tiltDeg * 0.6)}deg)` }}
        >
          {Array.from({ length: snowCount }, (_, index) => {
            const leftPct = ((index * 8 + 6) % 88) + 6;
            const duration = 2.2 + (index % 4) * 0.4;
            const delay = (index * 0.35) % 2.5;
            const size = 3 + (index % 3) * 1.5;

            return (
              <span
                key={index}
                className="weather-animated absolute rounded-full bg-white/80 dark:bg-white/70 shadow-xs"
                style={{
                  left: `${leftPct}%`,
                  top: '-15px',
                  width: `${size}px`,
                  height: `${size}px`,
                  animation: `weather-fall ${duration}s ease-in infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Lightning Flash for Thunder */}
      {category === 'thunder' && (
        <div
          className="weather-animated absolute inset-0 bg-white/40"
          style={{ animation: 'weather-flash 6s infinite' }}
        />
      )}
    </div>
  );
}
