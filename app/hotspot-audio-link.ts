import type { ArtifactAudio, ArtifactModelHotspot } from "./heritage-data";

export type HotspotAudioAction =
  | {
      kind: "play";
      trackId: string;
      isSameTrack: boolean;
      trackName: string;
      classification: ArtifactAudio["classification"];
    }
  | { kind: "noop"; reason: "no_audio_id" | "unknown_audio_id" | "player_unavailable" | "play_failed" };

export type ArtifactAudioPlayerHandle = {
  playTrack(trackId: string): HotspotAudioAction | undefined;
};

export function resolveHotspotAudioAction(
  hotspot: Pick<ArtifactModelHotspot, "audioId"> | null | undefined,
  tracks: readonly ArtifactAudio[],
  currentTrackId: string | undefined,
): HotspotAudioAction {
  const audioId = hotspot?.audioId?.trim();
  if (!audioId) return { kind: "noop", reason: "no_audio_id" };
  const track = tracks.find((candidate) => candidate.id === audioId);
  if (!track) return { kind: "noop", reason: "unknown_audio_id" };
  return {
    kind: "play",
    trackId: track.id,
    isSameTrack: track.id === currentTrackId,
    trackName: track.name,
    classification: track.classification,
  };
}

export function resolveHotspotClickOutcome(
  hotspot: Pick<ArtifactModelHotspot, "audioId"> | null | undefined,
  tracks: readonly ArtifactAudio[],
  currentTrackId: string | undefined,
  player: Pick<ArtifactAudioPlayerHandle, "playTrack"> | null | undefined,
): HotspotAudioAction {
  const action = resolveHotspotAudioAction(hotspot, tracks, currentTrackId);
  if (action.kind === "noop") return action;
  return player?.playTrack(action.trackId) ?? { kind: "noop", reason: "player_unavailable" };
}

export function buildHotspotAudioHint(action: HotspotAudioAction): string {
  switch (action.kind) {
    case "noop":
      if (action.reason === "unknown_audio_id") return "关联音频资料暂不可用。";
      if (action.reason === "player_unavailable") return "音频播放器暂不可用，请查看下方提示。";
      if (action.reason === "play_failed") return "关联音频未能开始播放，请查看下方播放器提示。";
      return "";
    case "play":
      return action.isSameTrack
        ? `正在重播当前关联音频：${action.trackName}。`
        : `已切换到关联音频并尝试播放：${action.trackName}。`;
  }
}

export function buildPlaybackNotice(
  error: unknown,
  track: Pick<ArtifactAudio, "classification"> | undefined,
): string | undefined {
  const errorName = error instanceof Error ? error.name : "";
  if (errorName === "AbortError") return undefined;
  const base =
    errorName === "NotAllowedError"
      ? "浏览器阻止了自动播放，请点击下方播放按钮继续试听"
      : "音频未能开始播放，请点击下方播放按钮重试";
  const disclaimer = track?.classification === "digitally_synthesized" ? "（数字合成音景，非原器或复原乐器录音）" : "";
  return `${base}${disclaimer}。`;
}

export type AudioElementSourceLike = {
  src: string;
  load(): void;
};

export function applyTrackSourceToElement(
  element: AudioElementSourceLike,
  track: ArtifactAudio,
  createSourceUrl: (track: ArtifactAudio) => string,
  revokeSourceUrl: (url: string) => void,
  previousObjectUrl: string | undefined,
): { objectUrl: string | undefined } {
  if (previousObjectUrl) revokeSourceUrl(previousObjectUrl);
  if (track.isBrowserGenerated) {
    const objectUrl = createSourceUrl(track);
    element.src = objectUrl;
    element.load();
    return { objectUrl };
  }
  if (track.filePath) {
    element.src = track.filePath;
    element.load();
    return { objectUrl: undefined };
  }
  throw new Error("Audio source is unavailable");
}

export type AudioPlaybackElementLike = {
  currentTime: number;
  play(): void | Promise<void>;
};

export function attemptTrackPlay(
  element: AudioPlaybackElementLike,
  options: { isSameTrack: boolean; onRejected(error: unknown): void },
): void {
  if (options.isSameTrack) element.currentTime = 0;
  let result: void | Promise<void>;
  try {
    result = element.play();
  } catch (error) {
    options.onRejected(error);
    return;
  }
  if (result && typeof (result as Promise<void>).then === "function") {
    (result as Promise<void>).then(
      () => {},
      (error: unknown) => options.onRejected(error),
    );
  }
}
