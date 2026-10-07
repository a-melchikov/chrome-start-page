import type { AnalogClockDialStyle } from './types';
import type { HandAngles } from './time-math';

export interface AnalogClockDialProps {
  dialStyle: AnalogClockDialStyle;
  handAngles: HandAngles;
  showSeconds: boolean;
  showDate: boolean;
  dateText?: string;
  showTimezone: boolean;
  timezoneText?: string;
  className?: string;
}

export function AnalogClockDial({
  dialStyle,
  handAngles,
  showSeconds,
  showDate,
  dateText,
  showTimezone,
  timezoneText,
  className = '',
}: AnalogClockDialProps) {
  const { hourAngle, minuteAngle, secondAngle } = handAngles;

  // 12 hour ticks coordinates helper
  const hourIndices = Array.from({ length: 12 }, (_, i) => i);

  return (
    <svg
      aria-hidden="true"
      className={`size-full max-h-full max-w-full select-none ${className}`}
      data-testid="analog-clock-svg"
      viewBox="0 0 200 200"
    >
      {/* Outer Dial Rim */}
      <circle
        className="text-theme-border/50"
        cx="100"
        cy="100"
        fill="none"
        r="88"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      {/* Hour Marks & Dial Details according to dialStyle */}
      {dialStyle === 'minimal' && (
        <g data-testid="dial-style-minimal">
          {hourIndices.map((i) => {
            const isCardinal = i % 3 === 0;
            const rOuter = 85;
            const rInner = isCardinal ? 72 : 78;
            const angleDeg = i * 30;
            const rad = (angleDeg * Math.PI) / 180;
            const x1 = 100 + rOuter * Math.sin(rad);
            const y1 = 100 - rOuter * Math.cos(rad);
            const x2 = 100 + rInner * Math.sin(rad);
            const y2 = 100 - rInner * Math.cos(rad);

            return (
              <line
                key={i}
                className={
                  isCardinal
                    ? 'text-theme-text-primary'
                    : 'text-theme-text-secondary/70'
                }
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth={isCardinal ? 3 : 1.75}
                x1={x1}
                x2={x2}
                y1={y1}
                y2={y2}
              />
            );
          })}
        </g>
      )}

      {dialStyle === 'numbers' && (
        <g data-testid="dial-style-numbers">
          {/* Ticks for non-cardinal hours */}
          {hourIndices.map((i) => {
            const isCardinal = i % 3 === 0;
            if (isCardinal) return null;

            const rOuter = 85;
            const rInner = 78;
            const angleDeg = i * 30;
            const rad = (angleDeg * Math.PI) / 180;
            const x1 = 100 + rOuter * Math.sin(rad);
            const y1 = 100 - rOuter * Math.cos(rad);
            const x2 = 100 + rInner * Math.sin(rad);
            const y2 = 100 - rInner * Math.cos(rad);

            return (
              <line
                key={i}
                className="text-theme-text-secondary/70"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth={1.75}
                x1={x1}
                x2={x2}
                y1={y1}
                y2={y2}
              />
            );
          })}

          {/* 12, 6, 9 Numerals */}
          <text
            className="fill-theme-text-primary font-semibold"
            dominantBaseline="central"
            fontSize="15"
            textAnchor="middle"
            x="100"
            y="27"
          >
            12
          </text>
          <text
            className="fill-theme-text-primary font-semibold"
            dominantBaseline="central"
            fontSize="15"
            textAnchor="middle"
            x="100"
            y="173"
          >
            6
          </text>
          <text
            className="fill-theme-text-primary font-semibold"
            dominantBaseline="central"
            fontSize="15"
            textAnchor="middle"
            x="27"
            y="100"
          >
            9
          </text>

          {/* Numeral 3 (hidden if date window takes its spot) */}
          {!showDate && (
            <text
              className="fill-theme-text-primary font-semibold"
              dominantBaseline="central"
              fontSize="15"
              textAnchor="middle"
              x="173"
              y="100"
            >
              3
            </text>
          )}
        </g>
      )}

      {dialStyle === 'bauhaus' && (
        <g data-testid="dial-style-bauhaus">
          {/* 60 minute marks (subtle) */}
          {Array.from({ length: 60 }, (_, i) => {
            if (i % 5 === 0) return null;
            const angleDeg = i * 6;
            const rad = (angleDeg * Math.PI) / 180;
            const x1 = 100 + 86 * Math.sin(rad);
            const y1 = 100 - 86 * Math.cos(rad);
            const x2 = 100 + 82 * Math.sin(rad);
            const y2 = 100 - 82 * Math.cos(rad);

            return (
              <line
                key={i}
                className="text-theme-text-secondary/40"
                stroke="currentColor"
                strokeWidth={1}
                x1={x1}
                x2={x2}
                y1={y1}
                y2={y2}
              />
            );
          })}

          {/* 12 rectangular hour batons */}
          {hourIndices.map((i) => {
            const isCardinal = i % 3 === 0;
            const rOuter = 86;
            const rInner = isCardinal ? 70 : 74;
            const angleDeg = i * 30;
            const rad = (angleDeg * Math.PI) / 180;
            const x1 = 100 + rOuter * Math.sin(rad);
            const y1 = 100 - rOuter * Math.cos(rad);
            const x2 = 100 + rInner * Math.sin(rad);
            const y2 = 100 - rInner * Math.cos(rad);

            return (
              <line
                key={i}
                className="text-theme-text-primary"
                stroke="currentColor"
                strokeLinecap="square"
                strokeWidth={isCardinal ? 4.5 : 3}
                x1={x1}
                x2={x2}
                y1={y1}
                y2={y2}
              />
            );
          })}
        </g>
      )}

      {/* Date Window at 3 o'clock */}
      {showDate && dateText && (
        <g data-testid="analog-date-window">
          <rect
            className="fill-theme-surface-elevated stroke-theme-border/80"
            height="18"
            rx="3"
            strokeWidth="1"
            width="34"
            x="130"
            y="91"
          />
          <text
            className="fill-theme-text-primary text-[9.5px] font-semibold tabular-nums tracking-tight"
            dominantBaseline="central"
            textAnchor="middle"
            x="147"
            y="100.5"
          >
            {dateText}
          </text>
        </g>
      )}

      {/* Timezone Label at 6 o'clock position (above/near the 6 marker) */}
      {showTimezone && timezoneText && (
        <text
          className="fill-theme-text-secondary text-[8.5px] font-medium tracking-wider uppercase"
          data-testid="analog-timezone-label"
          dominantBaseline="central"
          textAnchor="middle"
          x="100"
          y="136"
        >
          {timezoneText}
        </text>
      )}

      {/* Hour Hand */}
      {dialStyle === 'bauhaus' ? (
        <rect
          className="fill-theme-text-primary"
          data-testid="analog-hour-hand"
          height="52"
          rx="1"
          transform={`rotate(${hourAngle} 100 100)`}
          width="5.5"
          x="97.25"
          y="56"
        />
      ) : (
        <line
          className="text-theme-text-primary"
          data-testid="analog-hour-hand"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="5"
          transform={`rotate(${hourAngle} 100 100)`}
          x1="100"
          x2="100"
          y1="106"
          y2="56"
        />
      )}

      {/* Minute Hand */}
      {dialStyle === 'bauhaus' ? (
        <rect
          className="fill-theme-text-primary"
          data-testid="analog-minute-hand"
          height="74"
          rx="1"
          transform={`rotate(${minuteAngle} 100 100)`}
          width="3.5"
          x="98.25"
          y="34"
        />
      ) : (
        <line
          className="text-theme-text-primary"
          data-testid="analog-minute-hand"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3.25"
          transform={`rotate(${minuteAngle} 100 100)`}
          x1="100"
          x2="100"
          y1="110"
          y2="34"
        />
      )}

      {/* Center Pinion (Bottom Layer) */}
      <circle
        className="fill-theme-text-primary"
        cx="100"
        cy="100"
        r={dialStyle === 'bauhaus' ? 4.5 : 4}
      />

      {/* Second Hand (Accent Color) */}
      {showSeconds &&
        (dialStyle === 'bauhaus' ? (
          <g
            className="text-theme-accent"
            data-testid="analog-second-hand"
            transform={`rotate(${secondAngle} 100 100)`}
          >
            <line
              stroke="currentColor"
              strokeLinecap="square"
              strokeWidth="1.5"
              x1="100"
              x2="100"
              y1="120"
              y2="28"
            />
            {/* Iconic Swiss Bauhaus disc */}
            <circle cx="100" cy="38" fill="currentColor" r="4.5" />
            <circle cx="100" cy="100" fill="currentColor" r="3" />
          </g>
        ) : (
          <g
            className="text-theme-accent"
            data-testid="analog-second-hand"
            transform={`rotate(${secondAngle} 100 100)`}
          >
            <line
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
              x1="100"
              x2="100"
              y1="118"
              y2="26"
            />
            <circle cx="100" cy="100" fill="currentColor" r="3" />
          </g>
        ))}
    </svg>
  );
}
