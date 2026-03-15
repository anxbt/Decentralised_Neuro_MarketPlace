import React, { useMemo } from "react";

interface EEGWaveformProps {
  variant: "hero" | "card" | "detail";
}

/**
 * Generate a realistic EEG-like channel signal using superimposed
 * brainwave frequency bands (delta, theta, alpha, beta, gamma) plus
 * occasional spike/artifact transients that mimic real recordings.
 */
function generateChannel(length: number, amplitude: number, seed: number, bandIndex: number): string {
  const points: number[] = [];

  // Frequency bands (cycles per sample) tuned to approximate real EEG at ~256 Hz
  // Delta 0.5-4 Hz, Theta 4-8 Hz, Alpha 8-13 Hz, Beta 13-30 Hz, Gamma 30-50 Hz
  const bands = [
    { freq: 0.012, weight: 0.45 },  // delta
    { freq: 0.035, weight: 0.30 },  // theta
    { freq: 0.065, weight: 0.25 },  // alpha
    { freq: 0.12,  weight: 0.15 },  // beta
    { freq: 0.22,  weight: 0.08 },  // gamma
  ];

  // Emphasize the band this channel represents
  const emphasizedBands = bands.map((b, i) => ({
    ...b,
    weight: i === bandIndex ? b.weight * 2.5 : b.weight,
  }));

  // Seeded pseudo-random for deterministic per-card noise
  let rng = seed * 9301 + 49297;
  const pseudoRand = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280 - 0.5;
  };

  for (let i = 0; i < length; i++) {
    let y = 0;

    // Composite signal from all bands
    for (const { freq, weight } of emphasizedBands) {
      y += Math.sin(i * freq + seed * 1.7) * amplitude * weight;
      y += Math.sin(i * freq * 1.618 + seed * 0.3) * amplitude * weight * 0.3; // harmonic
    }

    // Pink noise envelope (slow modulation)
    y *= 0.7 + 0.3 * Math.sin(i * 0.003 + seed * 2.1);

    // Occasional sharp transients (eye blinks / K-complexes) — ~2% of samples
    const spike = pseudoRand();
    if (Math.abs(spike) > 0.46) {
      y += spike * amplitude * 1.4;
    }

    points.push(y);
  }

  return points.map((p, i) => `${i},${p}`).join(" ");
}

const bandLabels = ["δ Delta", "θ Theta", "α Alpha", "β Beta"];
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
      const pointsStr = generateChannel(width * 2, amp, c.seed, i);
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
