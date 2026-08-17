"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  WAVEFORM_BUCKET_COUNT,
  buildWaveformEnvelope,
  buildWaveformBars,
  createDemoWave,
  fetchWaveformBytes,
  formatWaveformTime,
  resolveWaveformSeekRatio,
  seekPercentToTime,
  type WaveformEnvelopePoint,
} from "../audio-waveform";
import type { ArtifactAudio } from "../heritage-data";

const envelopeCache = new Map<string, WaveformEnvelopePoint[]>();

type ArtifactWaveformProps = {
  track: ArtifactAudio;
  audioRef: RefObject<HTMLAudioElement | null>;
};

export default function ArtifactWaveform({ track, audioRef }: ArtifactWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const envelopeRef = useRef<WaveformEnvelopePoint[]>([]);
  const draggingRef = useRef(false);
  const sliderId = useId();
  const [failed, setFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const envelope = envelopeRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const audio = audioRef.current;
    const ratio = audio && Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.min(1, Math.max(0, audio.currentTime / audio.duration))
      : 0;
    const bars = buildWaveformBars(envelope, width, height, ratio);
    context.lineCap = "round";
    for (const bar of bars) {
      context.beginPath();
      context.moveTo(bar.x, bar.top);
      context.lineTo(bar.x, bar.bottom);
      context.strokeStyle = bar.played ? "#e8b86d" : "rgba(246, 234, 212, 0.72)";
      context.lineWidth = bar.lineWidth;
      context.stroke();
    }
  }, [audioRef]);

  const updateSliderValue = useCallback((percent: number, timeText: string) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const value = String(Math.min(100, Math.max(0, percent)));
    slider.value = value;
    slider.setAttribute("aria-valuenow", value);
    slider.setAttribute("aria-valuetext", timeText);
  }, []);

  const syncSlider = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || document.activeElement === sliderRef.current) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const percent = duration > 0 ? (audio.currentTime / duration) * 100 : 0;
    updateSliderValue(
      percent,
      duration > 0 ? `${formatWaveformTime(audio.currentTime)} / ${formatWaveformTime(duration)}` : "音频尚未加载",
    );
  }, [audioRef, updateSliderValue]);

  const handleSliderInput = (event: FormEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    if (duration <= 0) return;
    const time = seekPercentToTime(Number(event.currentTarget.value), duration);
    if (time === undefined) return;
    audio.currentTime = time;
    updateSliderValue((time / duration) * 100, `${formatWaveformTime(time)} / ${formatWaveformTime(duration)}`);
  };

  const seekFromPointer = (clientX: number) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    if (duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    audio.currentTime = resolveWaveformSeekRatio(clientX, rect.left, rect.width) * duration;
  };

  useLayoutEffect(() => {
    let disposed = false;
    let audioContext: AudioContext | undefined;
    let controller: AbortController | undefined;
    envelopeRef.current = [];
    drawWaveform();

    const load = async () => {
      setIsLoading(true);
      setFailed(false);
      try {
        const envelope = await buildWaveformEnvelope(track, {
          cache: envelopeCache,
          loadBytes: async (currentTrack) => {
            if (currentTrack.isBrowserGenerated) return createDemoWave().arrayBuffer();
            controller = new AbortController();
            return fetchWaveformBytes(currentTrack.filePath ?? "", { signal: controller.signal });
          },
          decode: async (bytes) => {
            const AudioContextCtor =
              window.AudioContext ??
              (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextCtor) throw new Error("AudioContext unavailable");
            audioContext = new AudioContextCtor();
            const audioBuffer = await audioContext.decodeAudioData(bytes);
            return {
              channels: Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => audioBuffer.getChannelData(index)),
            };
          },
          bucketCount: WAVEFORM_BUCKET_COUNT,
        });
        if (disposed) return;
        envelopeRef.current = envelope;
        drawWaveform();
      } catch {
        if (!disposed) setFailed(true);
      } finally {
        audioContext?.close().catch(() => {});
        if (!disposed) setIsLoading(false);
      }
    };

    void load();
    return () => {
      disposed = true;
      controller?.abort();
      audioContext?.close().catch(() => {});
    };
  }, [drawWaveform, track]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver === "function" && canvas) {
      resizeObserver = new ResizeObserver(() => drawWaveform());
      resizeObserver.observe(canvas);
    }
    const handleTime = () => { drawWaveform(); syncSlider(); };
    audio?.addEventListener("timeupdate", handleTime);
    audio?.addEventListener("durationchange", handleTime);
    audio?.addEventListener("loadedmetadata", handleTime);
    syncSlider();
    return () => {
      resizeObserver?.disconnect();
      audio?.removeEventListener("timeupdate", handleTime);
      audio?.removeEventListener("durationchange", handleTime);
      audio?.removeEventListener("loadedmetadata", handleTime);
    };
  }, [audioRef, drawWaveform, syncSlider]);

  return (
    <div className="audio-visual" data-waveform-state={failed ? "failed" : isLoading ? "loading" : "ready"}>
      {failed ? (
        <div className="audio-visual-bars" aria-hidden="true">{Array.from({ length: 34 }, (_, index) => <span key={index} style={{ height: `${18 + ((index * 17) % 54)}%` }} />)}</div>
      ) : (
        <canvas
          ref={canvasRef}
          className="audio-waveform-canvas"
          aria-hidden="true"
          onPointerDown={(event: ReactPointerEvent<HTMLCanvasElement>) => {
            draggingRef.current = true;
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Ignore unsupported capture. */ }
            seekFromPointer(event.clientX);
          }}
          onPointerMove={(event: ReactPointerEvent<HTMLCanvasElement>) => { if (draggingRef.current) seekFromPointer(event.clientX); }}
          onPointerUp={() => { draggingRef.current = false; }}
          onPointerCancel={() => { draggingRef.current = false; }}
        />
      )}
      {isLoading ? <p className="audio-waveform-status" role="status">正在解析波形…</p> : null}
      {failed ? <p className="audio-waveform-status" role="status">波形暂不可用，仍可正常播放音频。</p> : null}
      <div className="audio-waveform-slider">
        <label htmlFor={sliderId}>音频进度</label>
        <input
          id={sliderId}
          ref={sliderRef}
          type="range"
          min="0"
          max="100"
          step="1"
          defaultValue="0"
          aria-label={`${track.name} 播放进度`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext="音频尚未加载"
          onInput={handleSliderInput}
        />
      </div>
    </div>
  );
}
