import type { Artifact, ArtifactHighlight } from "./heritage-data";

export function getArtifactHeroHighlights(artifact: Artifact): ArtifactHighlight[] {
  if (artifact.highlights?.length) return artifact.highlights.slice(0, 3);

  return [
    artifact.period ? { value: artifact.period, label: "· 时代" } : undefined,
    artifact.material ? { value: artifact.material, label: "· 材质" } : undefined,
    artifact.artifactType ? { value: artifact.artifactType, label: "· 器物类型" } : undefined,
  ].filter((item): item is ArtifactHighlight => Boolean(item));
}
