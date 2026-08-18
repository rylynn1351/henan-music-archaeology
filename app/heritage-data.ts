import { artifactRegistry } from "./artifact-records/index.ts";

export type ContentClassification =
  | "archaeological_fact"
  | "research_hypothesis"
  | "digital_demonstration"
  | "artistic_creation";
export type ReviewStatus = "placeholder" | "draft" | "under_review" | "approved" | "published";
export type AudioClassification =
  | "original_artifact_recording"
  | "reconstructed_instrument"
  | "experimental_simulation"
  | "digitally_synthesized";
export type ModelClassification =
  | "real_scan"
  | "research_reconstruction"
  | "programmatic_demo"
  | "artistic_creation";
export type AssetAuthorizationStatus =
  | "unknown"
  | "pending"
  | "open_license"
  | "authorized"
  | "internal_only"
  | "not_applicable";
export type ArtifactCatalogVisibility = "internal" | "demo" | "public";
export type ModelUnit = "mm" | "cm" | "m";

export type ArtifactFilterCriteria = { query?: string; period?: string; material?: string; artifactType?: string };
export type ArtifactFilterOptions = { periods: string[]; materials: string[]; artifactTypes: string[] };
export type ArtifactFact = { label: string; value: string };
export type TimelineItem = { id: string; year: string; title: string; text: string };
export type GuideQuestion = { id: string; question: string; answer: string; keywords: string[] };
export type SourceReference = {
  id: string;
  name: string;
  authors?: string[];
  publication?: string;
  note?: string;
  href?: string;
};
export type ArtifactFieldReference = {
  field: string;
  sourceIds: string[];
  locator?: string;
  note?: string;
};
export type ArtifactImage = {
  id: string;
  src: string;
  alt: string;
  label?: string;
  caption?: string;
  credit?: string;
  sourceId?: string;
  license?: string;
  authorizationStatus?: AssetAuthorizationStatus;
  width?: number;
  height?: number;
  isPrimary?: boolean;
};
export type ArtifactModelHotspot = {
  id: string;
  name: string;
  position?: [number, number, number];
  description?: string;
  audioId?: string;
  sourceId?: string;
};
export type ArtifactModel = {
  classification: ModelClassification;
  glbPath?: string;
  hasRealFile: boolean;
  scale?: number;
  unit?: ModelUnit;
  rotation?: [number, number, number];
  hotspots?: ArtifactModelHotspot[];
  sourceId?: string;
  authorizationStatus?: AssetAuthorizationStatus;
  fallbackImageId?: string;
  ariaLabel?: string;
  notice?: string;
};
export type ArtifactAudio = {
  id: string;
  name: string;
  classification: AudioClassification;
  filePath?: string;
  isBrowserGenerated: boolean;
  relatedHotspotId?: string;
  sourceId?: string;
  authorizationStatus?: AssetAuthorizationStatus;
  description?: string;
  ariaLabel?: string;
};
export type ArtifactHighlight = { value: string; label: string };
export type Artifact = {
  id: string;
  slug: string;
  name: string;
  displayIndex?: string;
  subtitle?: string;
  period?: string;
  dateDescription?: string;
  discoveryDate?: string;
  material?: string;
  artifactType?: string;
  discoveryLocation?: string;
  currentCollection?: string;
  dimensions?: string;
  summary?: string;
  detailedDescription?: string;
  researchNote?: string;
  additionalFacts?: ArtifactFact[];
  highlights?: ArtifactHighlight[];
  images?: ArtifactImage[];
  timeline?: TimelineItem[];
  timelineBreakAfter?: number;
  timelineBreakLabel?: string;
  sources?: SourceReference[];
  questions?: GuideQuestion[];
  model?: ArtifactModel;
  audio?: ArtifactAudio[];
  tags?: string[];
  relatedArtifactIds?: string[];
  contentVersion?: string;
  fieldReferences?: ArtifactFieldReference[];
  contentClassification: ContentClassification;
  reviewStatus: ReviewStatus;
  reviewer?: string;
  reviewedAt?: string;
  assetReviewer?: string;
  assetsReviewedAt?: string;
  updatedAt?: string;
  assetNotices?: string[];
  isDemo: boolean;
  isPlaceholder?: boolean;
  catalogVisibility?: ArtifactCatalogVisibility;
};

const CONTENT_CLASSIFICATION_LABELS: Record<ContentClassification, string> = {
  archaeological_fact: "考古事实",
  research_hypothesis: "研究推测",
  digital_demonstration: "数字演示",
  artistic_creation: "艺术创作",
};
const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  placeholder: "占位资料",
  draft: "待专业成员审核",
  under_review: "审核中",
  approved: "已审核",
  published: "已发布",
};
const AUDIO_CLASSIFICATION_LABELS: Record<AudioClassification, string> = {
  original_artifact_recording: "原器录音",
  reconstructed_instrument: "复原乐器演奏",
  experimental_simulation: "实验模拟",
  digitally_synthesized: "数字合成",
};
const MODEL_CLASSIFICATION_LABELS: Record<ModelClassification, string> = {
  real_scan: "真实扫描",
  research_reconstruction: "研究复原",
  programmatic_demo: "程序化演示",
  artistic_creation: "艺术创作",
};

export const artifacts: Artifact[] = artifactRegistry;
export const featuredArtifact = artifacts[0];

export function getAllArtifacts(): readonly Artifact[] { return artifacts; }

export function isPlaceholderArtifact(artifact: Artifact): boolean {
  return artifact.isPlaceholder === true || artifact.reviewStatus === "placeholder";
}

export function getCatalogArtifacts(source: readonly Artifact[] = artifacts): Artifact[] {
  return source.filter((artifact) => {
    if (artifact.catalogVisibility === "internal" || artifact.reviewStatus === "under_review") return false;
    if (isPlaceholderArtifact(artifact)) return artifact.catalogVisibility === "public";
    return getDisplayableArtifacts([artifact]).length === 1;
  });
}

export function getDisplayableArtifacts(source: readonly Artifact[] = artifacts): Artifact[] {
  return source.filter((artifact) => {
    if (isPlaceholderArtifact(artifact) || artifact.reviewStatus === "under_review") return false;
    const approvedPublic = artifact.catalogVisibility === "public" && ["approved", "published"].includes(artifact.reviewStatus);
    const explicitDemo = artifact.catalogVisibility === "demo" && artifact.isDemo && ["draft", "approved", "published"].includes(artifact.reviewStatus);
    return approvedPublic || explicitDemo;
  });
}

function getUniqueFilterValues(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))))
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function getArtifactFilterOptions(source: readonly Artifact[] = artifacts): ArtifactFilterOptions {
  const catalog = getCatalogArtifacts(source);
  return {
    periods: getUniqueFilterValues(catalog.map((artifact) => artifact.period)),
    materials: getUniqueFilterValues(catalog.map((artifact) => artifact.material)),
    artifactTypes: getUniqueFilterValues(catalog.map((artifact) => artifact.artifactType)),
  };
}

export function filterArtifacts(source: readonly Artifact[] = artifacts, criteria: ArtifactFilterCriteria = {}): Artifact[] {
  const query = criteria.query?.trim().toLocaleLowerCase("zh-CN") ?? "";
  const period = criteria.period?.trim() ?? "";
  const material = criteria.material?.trim() ?? "";
  const artifactType = criteria.artifactType?.trim() ?? "";
  return getCatalogArtifacts(source).filter((artifact) =>
    (!query || artifact.name.toLocaleLowerCase("zh-CN").includes(query)) &&
    (!period || artifact.period?.trim() === period) &&
    (!material || artifact.material?.trim() === material) &&
    (!artifactType || artifact.artifactType?.trim() === artifactType));
}

function normalizeArtifactSlug(slug: string): string | undefined {
  const normalized = slug.trim();
  return normalized && normalized.length <= 128 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : undefined;
}

export function getArtifactBySlug(slug: string, source: readonly Artifact[] = artifacts): Artifact | undefined {
  const normalized = normalizeArtifactSlug(slug);
  return normalized ? source.find((artifact) => artifact.slug === normalized) : undefined;
}
export function getCatalogArtifactBySlug(slug: string, source: readonly Artifact[] = artifacts): Artifact | undefined {
  const artifact = getArtifactBySlug(slug, source);
  return artifact && getCatalogArtifacts([artifact])[0];
}
export function getDisplayableArtifactBySlug(slug: string, source: readonly Artifact[] = artifacts): Artifact | undefined {
  const artifact = getArtifactBySlug(slug, source);
  return artifact && getDisplayableArtifacts([artifact])[0];
}

export function getPrimaryImage(artifact: Artifact): ArtifactImage | undefined { return artifact.images?.find((image) => image.isPrimary) ?? artifact.images?.[0]; }
export function getPrimaryAudio(artifact: Artifact): ArtifactAudio | undefined { return artifact.audio?.[0]; }
export function getSourcesForArtifact(artifact: Artifact): SourceReference[] { return artifact.sources ?? []; }
export function getArtifactDisplayFacts(artifact: Artifact): ArtifactFact[] {
  const facts: Array<ArtifactFact | undefined> = [
    artifact.period ? { label: "时代", value: artifact.period } : undefined,
    artifact.dateDescription ? { label: "年代", value: artifact.dateDescription } : undefined,
    artifact.discoveryDate ? { label: "出土", value: artifact.discoveryDate } : undefined,
    artifact.discoveryLocation ? { label: "地点", value: artifact.discoveryLocation } : undefined,
    artifact.material ? { label: "材质", value: artifact.material } : undefined,
    artifact.dimensions ? { label: "规格", value: artifact.dimensions } : undefined,
  ];
  return [...facts.filter((fact): fact is ArtifactFact => Boolean(fact)), ...(artifact.additionalFacts ?? [])];
}

export type ArtifactValidationIssue = { artifactId: string; field: string; message: string };
export function validateArtifactCatalog(source: readonly Artifact[] = artifacts): ArtifactValidationIssue[] {
  const issues: ArtifactValidationIssue[] = [];
  const seen = { id: new Set<string>(), slug: new Set<string>(), displayIndex: new Set<string>() };
  const allIds = new Set(source.map((artifact) => artifact.id));
  const add = (artifact: Artifact, field: string, message: string) => issues.push({ artifactId: artifact.id, field, message });
  const isIsoDate = (value: string | undefined) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

  source.forEach((artifact) => {
    (["id", "slug", "displayIndex"] as const).forEach((field) => {
      const value = artifact[field];
      if (!value) return;
      if (seen[field].has(value)) add(artifact, field, `${field} 必须全局唯一`);
      seen[field].add(value);
    });
    const sourceIds = new Set<string>();
    const imageIds = new Set<string>();
    const audioIds = new Set<string>();
    artifact.sources?.forEach((item) => {
      if (sourceIds.has(item.id)) add(artifact, "sources.id", `来源 ID ${item.id} 必须在当前文物内唯一`);
      sourceIds.add(item.id);
    });
    artifact.images?.forEach((item) => {
      if (imageIds.has(item.id)) add(artifact, "images.id", `图片 ID ${item.id} 必须在当前文物内唯一`);
      imageIds.add(item.id);
    });
    artifact.audio?.forEach((item) => {
      if (audioIds.has(item.id)) add(artifact, "audio.id", `音频 ID ${item.id} 必须在当前文物内唯一`);
      audioIds.add(item.id);
    });
    const timelineIds = new Set<string>();
    const questionIds = new Set<string>();
    artifact.timeline?.forEach((item) => {
      if (timelineIds.has(item.id)) add(artifact, "timeline.id", `时间线 ID ${item.id} 必须在当前文物内唯一`);
      timelineIds.add(item.id);
    });
    artifact.questions?.forEach((item) => {
      if (questionIds.has(item.id)) add(artifact, "questions.id", `问答 ID ${item.id} 必须在当前文物内唯一`);
      questionIds.add(item.id);
    });
    const referencedFields = new Set<string>();
    artifact.fieldReferences?.forEach((reference) => {
      if (!reference.field.trim()) add(artifact, "fieldReferences.field", "字段引用必须指定字段路径");
      if (referencedFields.has(reference.field)) add(artifact, "fieldReferences.field", `字段 ${reference.field} 只能保留一条引用映射`);
      referencedFields.add(reference.field);
      if (!reference.sourceIds.length) add(artifact, "fieldReferences.sourceIds", `字段 ${reference.field} 至少需要一个来源`);
      reference.sourceIds.forEach((sourceId) => {
        if (!sourceIds.has(sourceId)) add(artifact, "fieldReferences.sourceIds", `字段 ${reference.field} 引用了不存在的来源 ${sourceId}`);
      });
      if (reference.field.startsWith("timeline.")) {
        const timelineId = reference.field.slice("timeline.".length).split(".")[0];
        if (!timelineIds.has(timelineId)) add(artifact, "fieldReferences.field", `字段引用指向不存在的时间线 ${timelineId}`);
      }
      if (reference.field.startsWith("questions.")) {
        const questionId = reference.field.slice("questions.".length).split(".")[0];
        if (!questionIds.has(questionId)) add(artifact, "fieldReferences.field", `字段引用指向不存在的问答 ${questionId}`);
      }
    });
    artifact.relatedArtifactIds?.forEach((id) => { if (!allIds.has(id)) add(artifact, "relatedArtifactIds", `关联文物 ${id} 不存在`); });
    artifact.images?.forEach((image) => {
      if (image.sourceId && !sourceIds.has(image.sourceId)) add(artifact, "images.sourceId", `图片来源 ${image.sourceId} 不存在`);
      if (artifact.catalogVisibility === "public" && !isPlaceholderArtifact(artifact) && (!image.sourceId || !image.authorizationStatus)) add(artifact, "images", "公开图片必须记录来源和授权状态");
    });
    if (artifact.model?.sourceId && !sourceIds.has(artifact.model.sourceId)) add(artifact, "model.sourceId", `模型来源 ${artifact.model.sourceId} 不存在`);
    if (artifact.model?.fallbackImageId && !imageIds.has(artifact.model.fallbackImageId)) add(artifact, "model.fallbackImageId", `备用图片 ${artifact.model.fallbackImageId} 不存在`);
    if (artifact.model?.classification === "real_scan" && !artifact.model.glbPath) add(artifact, "model.glbPath", "真实扫描模型必须提供 GLB 路径");
    artifact.model?.hotspots?.forEach((hotspot) => {
      if (hotspot.sourceId && !sourceIds.has(hotspot.sourceId)) add(artifact, "model.hotspots.sourceId", `热点来源 ${hotspot.sourceId} 不存在`);
      if (hotspot.audioId && !audioIds.has(hotspot.audioId)) add(artifact, "model.hotspots.audioId", `热点音频 ${hotspot.audioId} 不存在`);
    });
    artifact.audio?.forEach((audio) => {
      if (!audio.isBrowserGenerated && !audio.filePath) add(artifact, "audio.filePath", `音频 ${audio.id} 必须提供文件路径`);
      if (audio.sourceId && !sourceIds.has(audio.sourceId)) add(artifact, "audio.sourceId", `音频来源 ${audio.sourceId} 不存在`);
      if (artifact.catalogVisibility === "public" && !isPlaceholderArtifact(artifact) && (!audio.sourceId || !audio.authorizationStatus)) add(artifact, "audio", "公开音频必须记录来源和授权状态");
    });
    if (["approved", "published"].includes(artifact.reviewStatus) && (!artifact.reviewer || !artifact.reviewedAt || !artifact.contentVersion)) add(artifact, "review", "已审核或已发布记录必须填写资料版本、审核人和审核时间");
    if (!isIsoDate(artifact.reviewedAt)) add(artifact, "reviewedAt", "内容审核日期必须使用 YYYY-MM-DD 格式");
    if (!isIsoDate(artifact.assetsReviewedAt)) add(artifact, "assetsReviewedAt", "素材审核日期必须使用 YYYY-MM-DD 格式");
    const formalPublic = artifact.catalogVisibility === "public" && ["approved", "published"].includes(artifact.reviewStatus);
    const hasPublishedAssets = Boolean(artifact.images?.length || artifact.model?.glbPath || artifact.audio?.some((audio) => audio.filePath));
    if (formalPublic && hasPublishedAssets && (!artifact.assetReviewer || !artifact.assetsReviewedAt)) add(artifact, "assetReview", "包含公开素材的正式记录必须填写素材审核人和素材审核日期");
    if (formalPublic) artifact.sources?.forEach((source) => {
      if (!source.id.trim() || !source.name.trim()) add(artifact, "sources", "正式来源必须填写稳定 ID 和名称");
      if (!source.publication?.trim() && !source.href?.trim()) add(artifact, `sources.${source.id}`, "正式来源必须填写出版物信息或可核对链接");
    });
    if (isPlaceholderArtifact(artifact)) {
      const forbidden = [artifact.period, artifact.material, artifact.artifactType, artifact.detailedDescription, artifact.researchNote, ...(artifact.timeline ?? []).map((item) => item.text)];
      if (forbidden.some(Boolean)) add(artifact, "placeholder", "占位记录不得包含未经审核的专业陈述");
    }
  });
  return issues;
}

export function assertValidArtifactCatalog(source: readonly Artifact[] = artifacts): void {
  const issues = validateArtifactCatalog(source);
  if (issues.length) throw new Error(`文物目录校验失败：\n${issues.map((issue) => `${issue.artifactId}.${issue.field}: ${issue.message}`).join("\n")}`);
}

export function getContentClassificationLabel(value: ContentClassification): string { return CONTENT_CLASSIFICATION_LABELS[value]; }
export function getReviewStatusLabel(value: ReviewStatus): string { return REVIEW_STATUS_LABELS[value]; }
export function getAudioClassificationLabel(value: AudioClassification): string { return AUDIO_CLASSIFICATION_LABELS[value]; }
export function getModelClassificationLabel(value: ModelClassification): string { return MODEL_CLASSIFICATION_LABELS[value]; }

assertValidArtifactCatalog();
