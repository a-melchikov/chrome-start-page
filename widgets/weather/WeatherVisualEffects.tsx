import type { CSSProperties } from 'react';

import type { WeatherScene } from './weather-scene';
import './weather-effects.css';

interface WeatherVisualEffectsProps {
  scene: WeatherScene;
  height: number;
}

const rainCounts = [0, 9, 18, 30] as const;
const snowCounts = [0, 10, 16, 22] as const;

const stars = Array.from({ length: 9 }, (_, index) => ({
  left: `${12 + ((index * 31) % 79)}%`,
  top: `${12 + ((index * 19) % 44)}%`,
  opacity: 0.35 + (index % 3) * 0.15,
}));

function Cloud({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 300 125"
    >
      <path
        d="M24 101c-11 0-20-8-20-19 0-12 10-22 23-22 4 0 9 1 12 3 7-22 27-38 52-38 18 0 34 9 44 23 8-7 19-11 30-11 22 0 40 15 45 36 5-2 11-3 17-3 20 0 36 14 36 31H24Z"
        fill="currentColor"
      />
      <path
        d="M41 99c14-11 35-17 57-17 26 0 48 7 64 17H41Z"
        fill="white"
        opacity=".13"
      />
    </svg>
  );
}

export function WeatherVisualEffects({
  scene,
  height,
}: WeatherVisualEffectsProps) {
  const rainCount = rainCounts[scene.rainLevel];
  const snowCount = snowCounts[scene.snowLevel];
  const travel = Math.max(height, 160) + 120;
  const drift = Math.round(
    Math.tan((scene.windTiltDeg * Math.PI) / 180) * travel,
  );
  const style = {
    '--weather-cloud-duration': `${scene.cloudDurationSec}s`,
    '--weather-drift': `${drift}px`,
    '--weather-snow-drift': `${Math.round(drift * 0.55)}px`,
    '--weather-tilt': `${scene.windTiltDeg}deg`,
    '--weather-travel': `${travel}px`,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="weather-scene"
      data-day={scene.isDay}
      data-weather={scene.category}
      data-sun-level={scene.sunLevel}
      style={style}
    >
      {scene.sunLevel > 0 && (
        <div className="weather-orb weather-orb--sun">
          <div className="weather-sun-rays" />
          <div className="weather-sun-core" />
        </div>
      )}
      {!scene.isDay &&
        (scene.category === 'clear' || scene.category === 'cloudy') && (
          <>
            <div className="weather-stars">
              {stars.map((star, index) => (
                <span key={index} style={star} />
              ))}
            </div>
            <div className="weather-orb weather-orb--moon">
              <div className="weather-moon-core" />
            </div>
          </>
        )}
      {scene.cloudLevel > 0 && (
        <div className="weather-clouds">
          <Cloud className="weather-cloud weather-cloud--back" />
          {scene.cloudLevel === 2 && (
            <Cloud className="weather-cloud weather-cloud--middle" />
          )}
          <Cloud className="weather-cloud weather-cloud--front" />
        </div>
      )}
      {scene.category === 'fog' && (
        <div className="weather-fog">
          <span />
          <span />
          <span />
        </div>
      )}
      {rainCount > 0 && (
        <div
          className={`weather-rain weather-rain--${scene.rainLevel}${scene.isDrizzle ? ' weather-rain--drizzle' : ''}`}
        >
          {Array.from({ length: rainCount }, (_, index) => (
            <span
              key={index}
              style={
                {
                  left: `${((index * 37) % 116) - 8}%`,
                  top: `${-35 - ((index * 23) % 90)}px`,
                  height: `${scene.isDrizzle ? 9 + (index % 3) * 3 : 17 + (index % 4) * 6}px`,
                  animationDelay: `${-((index * 0.29) % 1.6)}s`,
                  animationDuration: `${1.2 - scene.rainLevel * 0.17 + (index % 4) * 0.08}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      {snowCount > 0 && (
        <div className="weather-snow">
          {Array.from({ length: snowCount }, (_, index) => (
            <span
              key={index}
              style={
                {
                  left: `${((index * 29) % 112) - 6}%`,
                  top: `${-20 - ((index * 19) % 100)}px`,
                  width: `${3 + (index % 3) * 2}px`,
                  height: `${3 + (index % 3) * 2}px`,
                  animationDelay: `${-((index * 0.47) % 5)}s`,
                  animationDuration: `${3.2 + (index % 4) * 0.55}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      {scene.category === 'thunder' && <div className="weather-lightning" />}
    </div>
  );
}
