import type { Artifact } from "../heritage-data";

/** Copy this object into a new record file, then replace every placeholder. */
export const artifactTemplate: Artifact = {
  id: "artifact-000",
  slug: "replace-with-stable-slug",
  displayIndex: "000",
  name: "待确认文物名称",
  period: undefined,
  material: undefined,
  artifactType: undefined,
  summary: undefined,
  detailedDescription: undefined,
  timeline: [],
  sources: [],
  images: [],
  model: undefined,
  audio: [],
  contentClassification: "archaeological_fact",
  reviewStatus: "placeholder",
  reviewer: undefined,
  reviewedAt: undefined,
  updatedAt: undefined,
  isDemo: false,
  isPlaceholder: true,
  catalogVisibility: "internal",
};
