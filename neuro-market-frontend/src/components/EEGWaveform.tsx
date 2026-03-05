import React, { useMemo } from "react";

interface EEGWaveformProps {
  variant: "hero" | "card" | "detail";
}

function generateChannel(length: number, amplitude: number, seed: number): string {
  const points: number[] = [];
  let y = 0;
  for (let i = 0; i < length; i++) {
    const noise = Math.sin(i * 0.1 + seed) * amplitude * 0.3
      + Math.sin(i * 0.37 + seed * 2) * amplitude * 0.2
      + Math.sin(i * 0.73 + seed * 3) * amplitude * 0.15
      + (Math.sin(i * 1.7 + seed * 5) > 0.7 ? amplitude * 0.6 * Math.sin(i * 2.3 + seed) : 0)
      + Math.sin(i * 0.02 + seed) * amplitude * 0.4;
    y = noise;
    points.push(y);
  }
  return points.map((p, i) => `${i},${p}`).join(" ");
}

const greekLabels = ["δ", "θ", "α", "β"];

const EEGWaveform: React.FC<EEGWaveformProps> = ({ variant }) => {
  const height = variant === "hero" ? 100 : variant === "card" ? 52 : 140;
  const channelCount = variant === "card" ? 2 : 4;
  const showLabels = variant === "detail";
  const width = 1200;

  const channels = useMemo(() => {
    const configs = [
      { color: "#F97316", opacity: 0.5, seed: 1.2 },
      { color: "#888888", opacity: 0.4, seed: 3.7 },
      { color: "#F97316", opacity: 0.3, seed: 5.1 },
      { color: "#888888", opacity: 0.25, seed: 7.9 },
    ];
    const amp = height / (channelCount * 2.5);
    return configs.slice(0, channelCount).map((c, i) => {
      const offsetY = (height / (channelCount + 1)) * (i + 1);
      const pointsStr = generateChannel(width * 2, amp, c.seed);
      return { ...c, offsetY, pointsStr };
    });
  }, [height, channelCount]);

  return (
    <div
      className={`relative w-full overflow-hidden ${variant === "card" ? "rounded-t-[4px]" : ""}`}
      style={{ height }}
    >
      {showLabels && (
        <div className="absolute left-3 top-0 bottom-0 z-10 flex flex-col justify-around py-2">
          {greekLabels.map((l) => (
            <span key={l} className="font-mono text-text-tertiary" style={{ fontSize: 10 }}>{l}</span>
          ))}
        </div>
      )}
      <svg
        className="eeg-animate"
        width={width * 2}
        height={height}
        viewBox={`0 0 ${width * 2} ${height}`}
        preserveAspectRatio="none"
        style={{ width: width * 2, minWidth: width * 2 }}
      >
        {channels.map((ch, i) => (
          <polyline
            key={i}
            points={ch.pointsStr}
            fill="none"
            stroke={ch.color}
            strokeWidth={1}
            opacity={ch.opacity}
            transform={`translate(0, ${ch.offsetY})`}
          />
        ))}
      </svg>
    </div>
  );
};

export default EEGWaveform;
