"use client";

import { useEffect, useRef, useState } from "react";
import { getAudioClassificationLabel, type ArtifactAudio } from "../heritage-data";

function createDemoWave(): Blob {
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

export function AudioPlayerFallback({ audio, message }: { audio?: ArtifactAudio; message: string }) {
  return (
    <div className="audio-card audio-fallback" role="status" data-module-fallback="audio">
      <div className="audio-visual" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>
      <div className="audio-copy"><span className="eyebrow light">声音体验</span><h3>{audio?.name ?? "声音资料待补充"}</h3>{audio?.description ? <p>{audio.description}</p> : null}<p className="module-error-message">{message}</p></div>
    </div>
  );
}

export default function ArtifactAudioPlayer({ tracks }: { tracks: readonly ArtifactAudio[] }) {
  const [selectedId, setSelectedId] = useState(tracks[0]?.id ?? "");
  const [errorMessage, setErrorMessage] = useState<string>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const selected = tracks.find((track) => track.id === selectedId) ?? tracks[0];

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !selected) return;
    let objectUrl: string | undefined;
    let disposed = false;
    setErrorMessage(undefined);
    const release = () => {
      try { element.pause(); element.removeAttribute("src"); element.load(); } catch { /* Continue cleanup. */ }
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = undefined; }
    };
    try {
      if (selected.isBrowserGenerated) { objectUrl = URL.createObjectURL(createDemoWave()); element.src = objectUrl; }
      else if (selected.filePath) element.src = selected.filePath;
      else throw new Error("Audio source is unavailable");
      element.load();
    } catch {
      release();
      queueMicrotask(() => { if (!disposed) setErrorMessage("当前浏览器无法创建或加载这段音频。"); });
    }
    return () => { disposed = true; release(); };
  }, [selected]);

  if (!selected) return <AudioPlayerFallback message="当前文物尚未提供可用的声音资料。" />;
  if (errorMessage) return <AudioPlayerFallback audio={selected} message={errorMessage} />;
  return (
    <div className="audio-card" data-audio-track-count={tracks.length}>
      <div className="audio-visual" aria-hidden="true">{Array.from({ length: 34 }, (_, index) => <span key={index} style={{ height: `${18 + ((index * 17) % 54)}%` }} />)}</div>
      <div className="audio-copy">
        <span className="eyebrow light">声音体验 · {getAudioClassificationLabel(selected.classification)}</span>
        <h3>{selected.name}</h3>
        {selected.description ? <p>{selected.description}</p> : null}
        {tracks.length > 1 ? (
          <label className="audio-track-select"><span>选择音频</span><select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>{tracks.map((track) => <option key={track.id} value={track.id}>{track.name} · {getAudioClassificationLabel(track.classification)}</option>)}</select></label>
        ) : null}
        <audio ref={audioRef} controls preload="metadata" aria-label={selected.ariaLabel ?? selected.name} onError={() => setErrorMessage("音频暂时无法加载或播放，请继续浏览文字和其他数字体验。")} />
      </div>
    </div>
  );
}
