import type { ArtifactAudio } from "./heritage-data";

export type WaveformEnvelopePoint = { min: number; max: number };
export type WaveformBarGeometry = {
  x: number;
  top: number;
  bottom: number;
  lineWidth: number;
  played: boolean;
};

export const WAVEFORM_BUCKET_COUNT = 96;

export function getWaveformCacheKey(
  track: Pick<ArtifactAudio, "id" | "isBrowserGenerated" | "filePath">,
): string {
  const source = track.isBrowserGenerated ? "browser:generated-demo" : `file:${track.filePath ?? ""}`;
  return `${track.id}|${source}`;
}

export function formatWaveformTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export async function fetchWaveformBytes(
  url: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<ArrayBuffer> {
  const response = await (options.fetchImpl ?? fetch)(url, { signal: options.signal });
  if (!response.ok) throw new Error(`波形数据加载失败：${response.status}`);
  return response.arrayBuffer();
}

export function seekPercentToTime(percent: number, duration: number): number | undefined {
  if (!Number.isFinite(duration) || duration <= 0) return undefined;
  const value = Number.isFinite(percent) ? percent : 0;
  return (Math.min(100, Math.max(0, value)) / 100) * duration;
}

export function resolveWaveformSeekRatio(clientX: number, rectLeft: number, rectWidth: number): number {
  if (!Number.isFinite(rectWidth) || rectWidth <= 0) return 0;
  return Math.min(1, Math.max(0, (clientX - rectLeft) / rectWidth));
}

export type WaveformDecodeResult = { channels: ArrayLike<number>[] };

export async function buildWaveformEnvelope(
  track: Pick<ArtifactAudio, "id" | "isBrowserGenerated" | "filePath">,
  deps: {
    cache: Map<string, WaveformEnvelopePoint[]>;
    loadBytes(track: Pick<ArtifactAudio, "id" | "isBrowserGenerated" | "filePath">): Promise<ArrayBuffer>;
    decode(bytes: ArrayBuffer): Promise<WaveformDecodeResult>;
    bucketCount?: number;
  },
): Promise<WaveformEnvelopePoint[]> {
  const key = getWaveformCacheKey(track);
  const cached = deps.cache.get(key);
  if (cached) return cached;
  const bytes = await deps.loadBytes(track);
  const { channels } = await deps.decode(bytes);
  const envelope = computeWaveformEnvelope(channels, deps.bucketCount ?? WAVEFORM_BUCKET_COUNT);
  deps.cache.set(key, envelope);
  return envelope;
}

export function createDemoWave(): Blob {
  const sampleRate = 22050;
  const duration = 11.2;
  const samples = new Int16Array(Math.floor(sampleRate * duration));
  const notes = [293.66, 329.63, 392, 440, 392, 329.63, 293.66, 246.94];
  const noteLength = duration / notes.length;
  samples.forEach((_, index) => {
    const time = index / sampleRate;
    const noteIndex = Math.min(Math.floor(time / noteLength), notes.length - 1);
    const local = time - noteIndex * noteLength;
    const envelope = Math.max(0, Math.min(local / 0.08, 1) * Math.min((noteLength - local) / 0.22, 1));
    const phase = 2 * Math.PI * notes[noteIndex] * (1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * time)) * time;
    const breath = (Math.sin(2 * Math.PI * 8300 * time) + Math.sin(2 * Math.PI * 6100 * time)) * 0.018;
    const sample = envelope * (0.58 * Math.sin(phase) + 0.2 * Math.sin(phase * 2) + 0.08 * Math.sin(phase * 3) + breath);
    samples[index] = Math.max(-1, Math.min(1, sample)) * 32767;
  });
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => { for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index)); };
  write(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); write(8, "WAVE"); write(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data");
  view.setUint32(40, samples.length * 2, true); samples.forEach((sample, index) => view.setInt16(44 + index * 2, sample, true));
  return new Blob([view], { type: "audio/wav" });
}

export function computeWaveformEnvelope(
  channels: readonly ArrayLike<number>[],
  bucketCount: number,
): WaveformEnvelopePoint[] {
  const safeBucketCount = Math.max(1, Math.floor(bucketCount));
  const points: WaveformEnvelopePoint[] = Array.from({ length: safeBucketCount }, () => ({ min: 0, max: 0 }));
  if (channels.length === 0) return points;

  const length = channels.reduce((acc, channel) => Math.max(acc, channel.length), 0);
  if (length === 0) return points;

  for (const channel of channels) {
    const bucketsPerSample = safeBucketCount / channel.length;
    for (let sampleIndex = 0; sampleIndex < channel.length; sampleIndex += 1) {
      const value = channel[sampleIndex];
      const bucketIndex = Math.min(safeBucketCount - 1, Math.floor(sampleIndex * bucketsPerSample));
      const point = points[bucketIndex];
      if (value < point.min) point.min = value;
      if (value > point.max) point.max = value;
    }
  }

  let peak = 0;
  for (const point of points) peak = Math.max(peak, Math.abs(point.min), Math.abs(point.max));
  if (peak > 0) {
    for (const point of points) {
      point.min /= peak;
      point.max /= peak;
    }
  }
  return points;
}

export function buildWaveformBars(
  envelope: readonly WaveformEnvelopePoint[],
  width: number,
  height: number,
  progressRatio: number,
): WaveformBarGeometry[] {
  if (envelope.length === 0 || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return [];
  }

  const safeProgress = Number.isFinite(progressRatio) ? Math.min(1, Math.max(0, progressRatio)) : 0;
  const step = width / envelope.length;
  const lineWidth = Math.min(3, Math.max(1, step * 0.52));
  const middle = height / 2;
  const maximumBarHeight = Math.max(2, height * 0.42);

  return envelope.map((point, index) => {
    const amplitude = Math.min(1, Math.max(0, Math.max(Math.abs(point.min), Math.abs(point.max))));
    const barHeight = Math.max(2, amplitude * maximumBarHeight);
    const x = (index + 0.5) * step;
    return {
      x,
      top: middle - barHeight / 2,
      bottom: middle + barHeight / 2,
      lineWidth,
      played: safeProgress > 0 && x / width <= safeProgress,
    };
  });
}
