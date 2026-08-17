"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import ArtifactWaveform from "./ArtifactWaveform";
import { createDemoWave } from "../audio-waveform";
import {
  applyTrackSourceToElement,
  attemptTrackPlay,
  buildPlaybackNotice,
  type ArtifactAudioPlayerHandle,
  type HotspotAudioAction,
} from "../hotspot-audio-link";
import { getAudioClassificationLabel, type ArtifactAudio } from "../heritage-data";

export function AudioPlayerFallback({ audio, message }: { audio?: ArtifactAudio; message: string }) {
  return (
    <div className="audio-card audio-fallback" role="status" data-module-fallback="audio">
      <div className="audio-visual" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>
      <div className="audio-copy"><span className="eyebrow light">声音体验</span><h3>{audio?.name ?? "声音资料待补充"}</h3>{audio?.description ? <p>{audio.description}</p> : null}<p className="module-error-message">{message}</p></div>
    </div>
  );
}

export default function ArtifactAudioPlayer({
  tracks,
  selectedTrackId,
  onSelectTrack,
  playerRef,
}: {
  tracks: readonly ArtifactAudio[];
  selectedTrackId?: string;
  onSelectTrack?: (trackId: string) => void;
  playerRef?: Ref<ArtifactAudioPlayerHandle>;
}) {
  const [internalTrackId, setInternalTrackId] = useState(tracks[0]?.id ?? "");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [playNotice, setPlayNotice] = useState<string>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentObjectUrlRef = useRef<string | undefined>(undefined);
  const appliedTrackIdRef = useRef<string | undefined>(undefined);
  const effectiveTrackId = selectedTrackId ?? internalTrackId;
  const selectedId = tracks.some((track) => track.id === effectiveTrackId) ? effectiveTrackId : tracks[0]?.id ?? "";
  const selected = tracks.find((track) => track.id === selectedId) ?? tracks[0];

  const applySource = useCallback((element: HTMLAudioElement, track: ArtifactAudio) => {
    const applied = applyTrackSourceToElement(
      element,
      track,
      () => URL.createObjectURL(createDemoWave()),
      (url) => URL.revokeObjectURL(url),
      currentObjectUrlRef.current,
    );
    currentObjectUrlRef.current = applied.objectUrl;
    appliedTrackIdRef.current = track.id;
  }, []);

  const selectTrack = useCallback((trackId: string) => {
    const element = audioRef.current;
    if (!element) return;
    const target = tracks.find((track) => track.id === trackId);
    if (!target) return;
    try {
      if (target.id !== appliedTrackIdRef.current) applySource(element, target);
      setInternalTrackId(target.id);
      onSelectTrack?.(target.id);
    } catch {
      setErrorMessage("当前浏览器无法创建或加载这段音频。");
    }
  }, [applySource, onSelectTrack, tracks]);

  const playTrack = useCallback((trackId: string): HotspotAudioAction | undefined => {
    const element = audioRef.current;
    if (!element) return undefined;
    const target = tracks.find((track) => track.id === trackId);
    if (!target) return { kind: "noop", reason: "unknown_audio_id" };
    const isSameTrack = target.id === appliedTrackIdRef.current;
    try {
      if (!isSameTrack) {
        applySource(element, target);
        setInternalTrackId(target.id);
        onSelectTrack?.(target.id);
      }
      setPlayNotice(undefined);
      attemptTrackPlay(element, {
        isSameTrack,
        onRejected: (error) => setPlayNotice(buildPlaybackNotice(error, target)),
      });
    } catch {
      setPlayNotice(buildPlaybackNotice(new Error("playback_failed"), target));
      return { kind: "noop", reason: "play_failed" };
    }
    return {
      kind: "play",
      trackId: target.id,
      isSameTrack,
      trackName: target.name,
      classification: target.classification,
    };
  }, [applySource, onSelectTrack, tracks]);

  useImperativeHandle(playerRef, () => ({ playTrack }), [playTrack]);

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !selected) return;
    let disposed = false;
    if (appliedTrackIdRef.current !== selected.id) {
      try {
        applySource(element, selected);
      } catch {
        queueMicrotask(() => { if (!disposed) setErrorMessage("当前浏览器无法创建或加载这段音频。"); });
      }
    }
    return () => {
      disposed = true;
      if (appliedTrackIdRef.current !== selected.id) return;
      try { element.pause(); } catch { /* Ignore unmount cleanup errors. */ }
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
        currentObjectUrlRef.current = undefined;
      }
      appliedTrackIdRef.current = undefined;
    };
  }, [applySource, selected]);

  if (!selected) return <AudioPlayerFallback message="当前文物尚未提供可用的声音资料。" />;
  if (errorMessage) return <AudioPlayerFallback audio={selected} message={errorMessage} />;
  return (
    <div className="audio-card" data-audio-track-count={tracks.length}>
      <ArtifactWaveform track={selected} audioRef={audioRef} />
      <div className="audio-copy">
        <span className="eyebrow light">声音体验 · {getAudioClassificationLabel(selected.classification)}</span>
        <h3>{selected.name}</h3>
        {selected.description ? <p>{selected.description}</p> : null}
        {tracks.length > 1 ? (
          <label className="audio-track-select"><span>选择音频</span><select value={selected.id} onChange={(event) => { selectTrack(event.target.value); }}>{tracks.map((track) => <option key={track.id} value={track.id}>{track.name} · {getAudioClassificationLabel(track.classification)}</option>)}</select></label>
        ) : null}
        <audio ref={audioRef} controls preload="metadata" aria-label={selected.ariaLabel ?? selected.name} onError={() => setErrorMessage("音频暂时无法加载或播放，请继续浏览文字和其他数字体验。")} />
        {playNotice ? <p className="audio-play-notice" role="status">{playNotice}</p> : null}
      </div>
    </div>
  );
}
