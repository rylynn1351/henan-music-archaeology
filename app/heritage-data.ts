export type ContentClassification =
  | "archaeological_fact"
  | "research_hypothesis"
  | "digital_demonstration"
  | "artistic_creation";

export type ReviewStatus =
  | "placeholder"
  | "draft"
  | "under_review"
  | "approved"
  | "published";

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

export type ArtifactFilterCriteria = {
  query?: string;
  period?: string;
  material?: string;
  artifactType?: string;
};

export type ArtifactFilterOptions = {
  periods: string[];
  materials: string[];
  artifactTypes: string[];
};

export type ArtifactFact = {
  label: string;
  value: string;
};

export type TimelineItem = {
  year: string;
  title: string;
  text: string;
};

export type GuideQuestion = {
  question: string;
  answer: string;
  keywords: string[];
};

export type SourceReference = {
  id: string;
  name: string;
  note?: string;
  href?: string;
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

export type ArtifactHighlight = {
  value: string;
  label: string;
};

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
  sources?: SourceReference[];
  questions?: GuideQuestion[];
  model?: ArtifactModel;
  audio?: ArtifactAudio[];

  tags?: string[];
  relatedArtifactIds?: string[];

  contentClassification: ContentClassification;
  reviewStatus: ReviewStatus;
  reviewer?: string;
  reviewedAt?: string;
  updatedAt?: string;

  assetNotices?: string[];
  isDemo: boolean;
  isPlaceholder?: boolean;
  catalogVisibility?: ArtifactCatalogVisibility;
};

const CONTENT_CLASSIFICATION_LABELS = {
  archaeological_fact: "考古事实",
  research_hypothesis: "研究推测",
  digital_demonstration: "数字演示",
  artistic_creation: "艺术创作",
} satisfies Record<ContentClassification, string>;

const REVIEW_STATUS_LABELS = {
  placeholder: "占位资料",
  draft: "待专业成员审核",
  under_review: "审核中",
  approved: "已审核",
  published: "已发布",
} satisfies Record<ReviewStatus, string>;

const AUDIO_CLASSIFICATION_LABELS = {
  original_artifact_recording: "原器录音",
  reconstructed_instrument: "复原乐器演奏",
  experimental_simulation: "实验模拟",
  digitally_synthesized: "数字合成",
} satisfies Record<AudioClassification, string>;

const MODEL_CLASSIFICATION_LABELS = {
  real_scan: "真实扫描",
  research_reconstruction: "研究复原",
  programmatic_demo: "程序化演示",
  artistic_creation: "艺术创作",
} satisfies Record<ModelClassification, string>;

export const artifactSources: SourceReference[] = [
  {
    id: "henan-museum-jiahu",
    name: "河南博物院｜贾湖骨笛",
    note: "藏品规格、出土地点、形制与专家点评",
    href: "https://www.chnmus.net/ch/collection/treasure/details.html?id=508164979145447651",
  },
  {
    id: "national-museum-bone-flute",
    name: "中国国家博物馆｜骨笛",
    note: "馆藏同类器的尺寸、孔数与工艺说明",
    href: "https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247261.shtml",
  },
  {
    id: "nature-1999-jiahu",
    name: "Nature 401, 366—368 (1999)",
    note: "考古年代、材质、完整标本与测音研究",
    href: "https://doi.org/10.1038/43865",
  },
  {
    id: "commons-jiahu-photo",
    name: "Wikimedia Commons｜Jiahu Bone Flute",
    note: "页面照片，ASHillocks，CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Jiahu_Bone_Flute.jpg",
  },
];

export const artifacts: Artifact[] = [
  {
    id: "artifact-001",
    slug: "jiahu-bone-flute",
    displayIndex: "001",
    name: "贾湖骨笛",
    subtitle: "把九千年前的一缕清音，带回当代",

    period: "新石器时代",
    dateDescription: "距今约 9,000—7,800 年",
    discoveryDate: "1987 年",
    material: "鹤类禽鸟中空尺骨",
    artifactType: "多音孔吹奏乐器",
    discoveryLocation: "河南舞阳贾湖遗址 M282 号墓",
    dimensions: "23.6 厘米（馆藏规格）",

    summary:
      "贾湖遗址出土的骨笛，是一组年代早、保存状况突出且经过测音研究的多音孔吹奏乐器。它们让我们能够从实物、测音与考古层位三个维度，重新理解中国新石器时代早期的音乐实践。",
    researchNote:
      "本页以河南博物院公开藏品信息与 1999 年《Nature》论文为基础。不同馆藏骨笛的尺寸、孔数和年代并不完全相同，展示时应避免把多件文物的信息混为一件。",
    highlights: [
      { value: "约 9000", label: "年前 · 早期标本" },
      { value: "30+", label: "支 · 多轮发掘记录" },
      { value: "多种孔数", label: "· 形制丰富" },
    ],

    images: [
      {
        id: "jiahu-primary-image",
        src: "/jiahu-bone-flute.jpg",
        alt: "贾湖遗址出土骨笛的同类文物参考照片",
        label: "参考图像",
        caption: "同类文物照片，摄于漯河市博物馆；非 M282:20 单件的精确对应。",
        credit: "ASHillocks / Wikimedia Commons / CC BY-SA 4.0",
        sourceId: "commons-jiahu-photo",
        license: "CC BY-SA 4.0",
        authorizationStatus: "open_license",
        width: 1920,
        height: 1440,
        isPrimary: true,
      },
    ],
    timeline: [
      {
        year: "约公元前 7000—5700 年",
        title: "贾湖先民生活于此",
        text: "《Nature》论文将贾湖遗址的占用年代置于这一时期；多音孔骨笛来自有放射性碳测年的考古层位。",
      },
      {
        year: "1984—1987 年",
        title: "持续考古发掘",
        text: "贾湖遗址开展多轮发掘，一批保存完整或残缺的骨笛陆续出土。",
      },
      {
        year: "1987 年",
        title: "M282 号墓骨笛出土",
        text: "河南博物院公开资料记录：馆藏代表性骨笛出土于河南舞阳贾湖遗址 M282 号墓。",
      },
      {
        year: "1999 年",
        title: "研究发表于《Nature》",
        text: "张居中等公布六支完整骨笛及测音结果，贾湖骨笛由此受到国际学界广泛关注。",
      },
      {
        year: "今天",
        title: "让文物可见、可听、可探索",
        text: "数字展示让公众在不接触原件的前提下理解文物形制、历史语境与音乐价值。",
      },
    ],
    sources: artifactSources,
    questions: [
      {
        question: "贾湖骨笛是什么？",
        answer:
          "它是河南舞阳贾湖新石器时代遗址出土的一组骨质吹奏乐器。多件骨笛带有 5、6、7 或 8 个孔，部分完整标本经过实际测音研究。",
        keywords: ["是什么", "介绍"],
      },
      {
        question: "贾湖骨笛距今多久？",
        answer:
          "贾湖遗址的年代约为距今 9,000—7,800 年；具体到每一支骨笛，年代要结合其考古层位分别判断。",
        keywords: ["多久", "多少年", "年代", "距今"],
      },
      {
        question: "它在哪里出土？",
        answer:
          "骨笛出土于河南省漯河市舞阳县的贾湖遗址。河南博物院公开的代表性藏品来自 M282 号墓。",
        keywords: ["哪里", "地点", "出土", "舞阳"],
      },
      {
        question: "骨笛用什么材料制作？",
        answer:
          "研究与馆藏资料显示，贾湖骨笛以鹤类禽鸟中空的尺骨制作；论文对所研究标本的鉴定指向丹顶鹤尺骨。",
        keywords: ["材料", "什么做", "尺骨", "鹤"],
      },
      {
        question: "为什么它如此重要？",
        answer:
          "因为它同时具备年代早、考古层位清楚、保存较完整、可进行测音和多音孔等特点，为研究早期音乐实践提供了罕见的实物证据。",
        keywords: ["重要", "价值", "意义", "为什么"],
      },
      {
        question: "骨笛一共有几个孔？",
        answer:
          "不同标本并不相同，已见 5、6、7、8 孔等类型；河南博物院重点展示的 M282 号墓代表性骨笛为 7 孔。",
        keywords: ["几个孔", "多少孔", "孔数", "七孔"],
      },
      {
        question: "它现在还能吹奏吗？",
        answer:
          "1999 年论文记载，保存最好的一支骨笛曾被吹奏并进行音高分析。今天的文物展示应优先保护原件，演奏研究通常更适合使用复原件。",
        keywords: ["吹奏", "还能吹", "演奏", "声音"],
      },
      {
        question: "页面里的 3D 模型是真实扫描吗？",
        answer:
          "不是。当前是依据骨笛一般形态制作的程序化功能模型，只用于演示旋转、缩放和数字标注流程，不代表任何一件文物的精确扫描或复原。",
        keywords: ["3d", "模型", "扫描", "真实"],
      },
      {
        question: "演示音频是真实骨笛录音吗？",
        answer:
          "不是。当前音频为浏览器合成的占位音色，用于展示播放器功能，不应被用于说明贾湖骨笛的真实音色。",
        keywords: ["音频", "录音", "音色", "音乐"],
      },
      {
        question: "这个 AI 讲解员接入大模型了吗？",
        answer:
          "还没有。当前仅按关键词匹配本地预设答案，便于团队先验证交互形式；后续可在专业资料审校后接入带来源引用的知识库。",
        keywords: ["ai", "大模型", "知识库", "rag", "讲解员"],
      },
    ],
    model: {
      classification: "programmatic_demo",
      hasRealFile: false,
      fallbackImageId: "jiahu-primary-image",
      ariaLabel: "可旋转的骨笛功能演示模型",
      notice: "功能演示模型 · 非文物扫描 · 不代表真实比例、纹理与复原结论",
    },
    audio: [
      {
        id: "jiahu-synthetic-demo",
        name: "听见远古 · 合成音色占位演示",
        classification: "digitally_synthesized",
        isBrowserGenerated: true,
        description: "用于验证播放、进度和音量控制；不是贾湖骨笛原件或复原件录音。",
        ariaLabel: "合成占位演示音频",
      },
    ],

    contentClassification: "archaeological_fact",
    reviewStatus: "draft",
    updatedAt: "2026-07-14",
    assetNotices: [
      "功能演示模型 · 非文物扫描 · 不代表真实比例、纹理与复原结论",
      "用于验证播放、进度和音量控制；不是贾湖骨笛原件或复原件录音。",
    ],
    isDemo: true,
    isPlaceholder: false,
    catalogVisibility: "demo",
  },
];

export const featuredArtifact = artifacts[0];

export function getAllArtifacts(): readonly Artifact[] {
  return artifacts;
}

export function getDisplayableArtifacts(
  source: readonly Artifact[] = artifacts,
): Artifact[] {
  return source.filter((artifact) => {
    if (
      artifact.isPlaceholder ||
      artifact.reviewStatus === "placeholder" ||
      artifact.reviewStatus === "under_review"
    ) {
      return false;
    }

    const isApprovedForPublic =
      artifact.catalogVisibility === "public" &&
      (artifact.reviewStatus === "approved" || artifact.reviewStatus === "published");
    const isExplicitConceptDemo =
      artifact.catalogVisibility === "demo" &&
      artifact.isDemo &&
      artifact.reviewStatus === "draft";
    const isApprovedDemo =
      artifact.catalogVisibility === "demo" &&
      artifact.isDemo &&
      (artifact.reviewStatus === "approved" || artifact.reviewStatus === "published");

    return isApprovedForPublic || isExplicitConceptDemo || isApprovedDemo;
  });
}

function getUniqueFilterValues(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function getArtifactFilterOptions(
  source: readonly Artifact[] = artifacts,
): ArtifactFilterOptions {
  const displayableArtifacts = getDisplayableArtifacts(source);

  return {
    periods: getUniqueFilterValues(displayableArtifacts.map((artifact) => artifact.period)),
    materials: getUniqueFilterValues(displayableArtifacts.map((artifact) => artifact.material)),
    artifactTypes: getUniqueFilterValues(
      displayableArtifacts.map((artifact) => artifact.artifactType),
    ),
  };
}

export function filterArtifacts(
  source: readonly Artifact[] = artifacts,
  criteria: ArtifactFilterCriteria = {},
): Artifact[] {
  const query = criteria.query?.trim().toLocaleLowerCase("zh-CN") ?? "";
  const period = criteria.period?.trim() ?? "";
  const material = criteria.material?.trim() ?? "";
  const artifactType = criteria.artifactType?.trim() ?? "";

  return getDisplayableArtifacts(source).filter((artifact) => {
    const matchesName =
      !query || artifact.name.toLocaleLowerCase("zh-CN").includes(query);
    const matchesPeriod = !period || artifact.period?.trim() === period;
    const matchesMaterial = !material || artifact.material?.trim() === material;
    const matchesArtifactType =
      !artifactType || artifact.artifactType?.trim() === artifactType;

    return matchesName && matchesPeriod && matchesMaterial && matchesArtifactType;
  });
}

function normalizeArtifactSlug(slug: string): string | undefined {
  const normalizedSlug = slug.trim();
  if (
    !normalizedSlug ||
    normalizedSlug.length > 128 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)
  ) {
    return undefined;
  }
  return normalizedSlug;
}

export function getArtifactBySlug(
  slug: string,
  source: readonly Artifact[] = artifacts,
): Artifact | undefined {
  const normalizedSlug = normalizeArtifactSlug(slug);
  if (!normalizedSlug) return undefined;
  return source.find((artifact) => artifact.slug === normalizedSlug);
}

export function getDisplayableArtifactBySlug(
  slug: string,
  source: readonly Artifact[] = artifacts,
): Artifact | undefined {
  const artifact = getArtifactBySlug(slug, source);
  if (!artifact) return undefined;
  return getDisplayableArtifacts([artifact])[0];
}

export function getPrimaryImage(artifact: Artifact): ArtifactImage | undefined {
  return artifact.images?.find((image) => image.isPrimary) ?? artifact.images?.[0];
}

export function getPrimaryAudio(artifact: Artifact): ArtifactAudio | undefined {
  return artifact.audio?.[0];
}

export function getSourcesForArtifact(artifact: Artifact): SourceReference[] {
  return artifact.sources ?? [];
}

export function getArtifactDisplayFacts(artifact: Artifact): ArtifactFact[] {
  const facts: Array<ArtifactFact | undefined> = [
    artifact.period ? { label: "时代", value: artifact.period } : undefined,
    artifact.dateDescription ? { label: "年代", value: artifact.dateDescription } : undefined,
    artifact.discoveryDate ? { label: "出土", value: artifact.discoveryDate } : undefined,
    artifact.discoveryLocation ? { label: "地点", value: artifact.discoveryLocation } : undefined,
    artifact.material ? { label: "材质", value: artifact.material } : undefined,
    artifact.dimensions ? { label: "规格", value: artifact.dimensions } : undefined,
  ];

  return [
    ...facts.filter((fact): fact is ArtifactFact => Boolean(fact)),
    ...(artifact.additionalFacts ?? []),
  ];
}

export function getContentClassificationLabel(classification: ContentClassification): string {
  return CONTENT_CLASSIFICATION_LABELS[classification];
}

export function getReviewStatusLabel(status: ReviewStatus): string {
  return REVIEW_STATUS_LABELS[status];
}

export function getAudioClassificationLabel(classification: AudioClassification): string {
  return AUDIO_CLASSIFICATION_LABELS[classification];
}

export function getModelClassificationLabel(classification: ModelClassification): string {
  return MODEL_CLASSIFICATION_LABELS[classification];
}
