import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  artifacts,
  getAllArtifacts,
  getArtifactBySlug,
  getArtifactDisplayFacts,
  getArtifactFilterOptions,
  getAudioClassificationLabel,
  getDisplayableArtifactBySlug,
  getDisplayableArtifacts,
  filterArtifacts,
  getModelClassificationLabel,
  getPrimaryAudio,
  getPrimaryImage,
  getReviewStatusLabel,
  getSourcesForArtifact,
} from "../app/heritage-data.ts";
import {
  GUIDE_NO_MATCH_ANSWER,
  getLocalGuideAnswer,
} from "../app/guide-utils.ts";

const root = new URL("../", import.meta.url);

async function startProductionServer() {
  const child = spawn(
    process.execPath,
    ["scripts/start-production.mjs", "--host", "127.0.0.1", "--port", "0"],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";

  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Production server did not start in time.\n${output}`));
    }, 15_000);

    const collect = (chunk) => {
      output += chunk.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number.parseInt(match[1], 10));
      }
    };

    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(
        new Error(`Production server exited before it was ready (${code}).\n${output}`),
      );
    });
  });

  return { child, port: await ready };
}

function createTestArtifact(overrides = {}) {
  return {
    id: "test-artifact",
    slug: "test-artifact",
    name: "测试文物",
    period: "测试时期",
    material: "测试材质",
    artifactType: "测试类型",
    contentClassification: "archaeological_fact",
    reviewStatus: "approved",
    isDemo: false,
    isPlaceholder: false,
    catalogVisibility: "public",
    ...overrides,
  };
}

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(pathname, "http://localhost"), {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Jiahu heritage demo", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const visibleDocument = html.split('<script id="_R_">')[0];
  assert.match(html, /<title>贾湖骨笛数字展示 Demo｜豫音焕新声<\/title>/);
  assert.match(html, /property="og:title" content="豫音焕新声｜贾湖骨笛数字展示 Demo"/);
  assert.match(html, /property="og:locale" content="zh_CN"/);
  assert.match(html, /豫音焕新声/);
  assert.match(html, /贾湖骨笛/);
  assert.match(html, /2026 大学生创新训练计划/);
  assert.match(html, /项目概念验证/);
  assert.match(html, /多种孔数/);
  assert.match(html, /形制丰富/);
  assert.match(html, /当前为概念验证Demo，非最终研究成果/);
  assert.match(html, /文物总览/);
  assert.match(html, /当前已公开或允许展示的文物/);
  assert.match(html, /data-artifact-count="1"/);
  assert.match(html, /data-artifact-card="jiahu-bone-flute"/);
  assert.match(html, /查看贾湖骨笛详情/);
  assert.match(html, /href="\/artifacts\/jiahu-bone-flute"/);
  assert.match(html, /按文物名称搜索/);
  assert.match(html, /按年代或时期筛选/);
  assert.match(html, /按材质筛选/);
  assert.match(html, /按器物类型筛选/);
  assert.match(html, /重置筛选/);
  assert.match(html, /data-filtered-artifact-count="1"/);
  assert.match(html, /待专业成员审核/);
  assert.doesNotMatch(html, /id="artifact"|id="timeline"|id="experience"|id="guide"/);
  assert.doesNotMatch(html, /内容审核状态|最后更新时间|数字讲解员/);
  assert.doesNotMatch(html, /国家级推荐|5—8<\/strong>/);
  assert.doesNotMatch(
    visibleDocument,
    /programmatic_demo|digitally_synthesized|archaeological_fact/,
  );
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("local production server serves its rendered asset URLs", async () => {
  const { child, port } = await startProductionServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);

    const html = await response.text();
    const assetPaths = [
      ...new Set(
        [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
          (match) => match[1],
        ),
      ),
    ];

    assert.ok(assetPaths.length > 0, "Rendered HTML should reference built assets");

    for (const assetPath of assetPaths) {
      const assetResponse = await fetch(`http://127.0.0.1:${port}${assetPath}`);
      assert.equal(assetResponse.status, 200, `${assetPath} should be served`);
    }
  } finally {
    child.kill();
  }
});

test("server-renders a displayable artifact from its standalone slug route", async () => {
  const response = await render("/artifacts/jiahu-bone-flute");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>贾湖骨笛数字展示｜豫音焕新声<\/title>/);
  assert.match(html, /property="og:title" content="贾湖骨笛数字展示｜豫音焕新声"/);
  assert.match(html, /贾湖骨笛/);
  assert.match(html, /返回文物总览/);
  assert.match(html, /href="\/#artifacts"/);
  assert.match(html, /内容分类/);
  assert.match(html, /考古事实/);
  assert.match(html, /内容审核状态/);
  assert.match(html, /待专业成员审核/);
  assert.match(html, /资料来源/);
  assert.match(html, /当前为概念验证Demo，非最终研究成果/);
  assert.match(html, /骨笛形制 · 交互模型/);
  assert.match(html, /合成音色占位演示/);
  assert.match(html, /数字讲解员/);
  assert.doesNotMatch(html, /文物总览 · COLLECTION/);
});

test("unknown and malformed artifact routes render a friendly 404", async () => {
  for (const pathname of [
    "/artifacts/does-not-exist",
    "/artifacts/%E6%B5%8B%E8%AF%95",
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 404);

    const html = await response.text();
    assert.match(
      html,
      /(?:name="robots" content="[^"]*noindex|content="[^"]*noindex[^"]*" name="robots")/,
    );
    assert.match(html, /未找到可展示的文物/);
    assert.match(html, /返回文物总览/);
    assert.match(html, /href="\/#artifacts"/);
    assert.doesNotMatch(html, /Error:|at ArtifactPage|stack/i);
  }
});

test("keeps artifact data, sources, warnings, and assets explicit", async () => {
  const [
    data,
    homePage,
    experience,
    detail,
    card,
    overview,
    imageComponent,
    moduleErrorBoundary,
    guideUtilsSource,
    routePage,
    notFoundPage,
    routeErrorPage,
    packageJson,
  ] = await Promise.all([
    readFile(new URL("../app/heritage-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/HeritageDemo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ArtifactExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ArtifactDetail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactOverview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactImage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ModuleErrorBoundary.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/guide-utils.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/artifacts/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/artifacts/[slug]/not-found.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/artifacts/[slug]/error.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    access(new URL("public/jiahu-bone-flute.jpg", root)),
  ]);

  assert.match(data, /export type Artifact =/);
  assert.match(data, /export const artifacts: Artifact\[\]/);
  assert.match(data, /contentClassification/);
  assert.match(data, /reviewStatus/);
  assert.match(data, /updatedAt: "2026-07-14"/);
  assert.match(data, /河南博物院/);
  assert.match(data, /doi\.org\/10\.1038\/43865/);
  assert.match(detail, /getArtifactDisplayFacts/);
  assert.match(detail, /getContentClassificationLabel/);
  assert.match(detail, /artifact\.reviewStatus/);
  assert.match(detail, /ArtifactImage/);
  assert.match(detail, /artifact-photo-image-fallback/);
  assert.match(card, /getPrimaryImage/);
  assert.match(card, /ArtifactImage/);
  assert.match(card, /artifact-card-image-fallback/);
  assert.match(card, /getReviewStatusLabel/);
  assert.match(card, /encodeURIComponent\(artifact\.slug\)/);
  assert.match(card, /<Link/);
  assert.match(overview, /filteredArtifacts\.map/);
  assert.match(overview, /暂无可展示文物/);
  assert.match(overview, /filterArtifacts/);
  assert.match(overview, /getArtifactFilterOptions/);
  assert.match(overview, /恢复全部文物/);
  assert.match(imageComponent, /onError=\{\(\) => setFailedSrc\(image\.src\)\}/);
  assert.match(imageComponent, /data-image-fallback=/);
  assert.match(moduleErrorBoundary, /getDerivedStateFromError/);
  assert.match(guideUtilsSource, /GUIDE_NO_MATCH_ANSWER/);
  assert.match(homePage, /ArtifactOverview/);
  assert.match(homePage, /getDisplayableArtifacts/);
  assert.doesNotMatch(homePage, /ArtifactDetail|OrbitControls|createDemoWave|GuideChat/);
  assert.match(experience, /ArtifactDetail/);
  assert.match(experience, /OrbitControls/);
  assert.match(experience, /createDemoWave/);
  assert.match(experience, /function GuideChat/);
  assert.match(experience, /data-module-fallback="3d"/);
  assert.match(experience, /data-module-fallback="audio"/);
  assert.match(experience, /data-module-fallback="guide"/);
  assert.match(experience, /时间线资料待补充/);
  assert.match(experience, /资料来源待团队提供/);
  assert.match(experience, /当前暂无问答资料/);
  assert.match(experience, /ModuleErrorBoundary/);
  assert.match(experience, /URL\.revokeObjectURL/);
  assert.match(routePage, /getDisplayableArtifactBySlug/);
  assert.match(routePage, /ArtifactExperience/);
  assert.match(routePage, /notFound\(\)/);
  assert.doesNotMatch(routePage, /贾湖|jiahu-bone-flute/);
  assert.match(notFoundPage, /未找到可展示的文物/);
  assert.match(routeErrorPage, /文物资料暂时无法读取/);
  assert.match(data, /非文物扫描/);
  assert.match(data, /不是贾湖骨笛原件或复原件录音/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("keeps the Jiahu artifact in the unified multi-artifact structure", () => {
  const allArtifacts = getAllArtifacts();
  assert.ok(Array.isArray(allArtifacts));
  assert.equal(allArtifacts.length, 1, "No unreviewed second artifact should be added in this task");

  const ids = new Set(allArtifacts.map((artifact) => artifact.id));
  const slugs = new Set(allArtifacts.map((artifact) => artifact.slug));
  assert.equal(ids.size, allArtifacts.length);
  assert.equal(slugs.size, allArtifacts.length);

  for (const artifact of allArtifacts) {
    assert.ok(artifact.id);
    assert.ok(artifact.slug);
    assert.ok(artifact.name);
    assert.ok(artifact.contentClassification);
    assert.ok(artifact.reviewStatus);
    assert.equal(typeof artifact.isDemo, "boolean");
  }

  const artifact = getArtifactBySlug("jiahu-bone-flute");
  assert.ok(artifact);
  assert.equal(getArtifactBySlug(" jiahu-bone-flute "), artifact);
  assert.equal(getArtifactBySlug("does-not-exist"), undefined);
  assert.equal(getArtifactBySlug(""), undefined);
  assert.equal(getArtifactBySlug("测试"), undefined);
  assert.equal(getDisplayableArtifactBySlug("jiahu-bone-flute"), artifact);
  assert.equal(getDisplayableArtifactBySlug("does-not-exist"), undefined);

  const audio = getPrimaryAudio(artifact);
  assert.ok(audio);
  assert.equal(audio.classification, "digitally_synthesized");
  assert.notEqual(audio.classification, "original_artifact_recording");
  assert.equal(audio.isBrowserGenerated, true);
  assert.equal(getAudioClassificationLabel(audio.classification), "数字合成");

  assert.ok(artifact.model);
  assert.equal(artifact.model.classification, "programmatic_demo");
  assert.notEqual(artifact.model.classification, "real_scan");
  assert.equal(artifact.model.hasRealFile, false);
  assert.equal(getModelClassificationLabel(artifact.model.classification), "程序化演示");

  const image = getPrimaryImage(artifact);
  assert.ok(image);
  assert.equal(image.src, "/jiahu-bone-flute.jpg");
  assert.equal(image.width, 1920);
  assert.equal(image.height, 1440);
  assert.equal(getReviewStatusLabel(artifact.reviewStatus), "待专业成员审核");
  assert.equal(artifacts[0], artifact);
});

test("only returns artifacts explicitly allowed in the catalog", () => {
  const currentArtifact = artifacts[0];
  const internalArtifact = {
    ...currentArtifact,
    id: "internal-test-artifact",
    slug: "internal-test-artifact",
    catalogVisibility: "internal",
  };
  const placeholderArtifact = {
    ...currentArtifact,
    id: "placeholder-test-artifact",
    slug: "placeholder-test-artifact",
    reviewStatus: "placeholder",
    isPlaceholder: true,
    catalogVisibility: "demo",
  };
  const hiddenByDefaultArtifact = {
    ...currentArtifact,
    id: "hidden-by-default-test-artifact",
    slug: "hidden-by-default-test-artifact",
    catalogVisibility: undefined,
  };
  const publicDraftArtifact = {
    ...currentArtifact,
    id: "public-draft-test-artifact",
    slug: "public-draft-test-artifact",
    reviewStatus: "draft",
    isDemo: false,
    catalogVisibility: "public",
  };
  const underReviewArtifact = {
    ...currentArtifact,
    id: "under-review-test-artifact",
    slug: "under-review-test-artifact",
    reviewStatus: "under_review",
    isDemo: false,
    catalogVisibility: "public",
  };
  const approvedPublicArtifact = {
    ...currentArtifact,
    id: "approved-public-test-artifact",
    slug: "approved-public-test-artifact",
    reviewStatus: "approved",
    isDemo: false,
    catalogVisibility: "public",
  };

  const fixtures = [
    currentArtifact,
    internalArtifact,
    placeholderArtifact,
    hiddenByDefaultArtifact,
    publicDraftArtifact,
    underReviewArtifact,
    approvedPublicArtifact,
  ];
  const displayable = getDisplayableArtifacts(fixtures);

  assert.deepEqual(
    displayable.map((artifact) => artifact.slug),
    ["jiahu-bone-flute", "approved-public-test-artifact"],
  );
  assert.equal(
    getDisplayableArtifactBySlug(currentArtifact.slug, fixtures),
    currentArtifact,
  );
  assert.equal(
    getDisplayableArtifactBySlug(internalArtifact.slug, fixtures),
    undefined,
  );
  assert.equal(
    getDisplayableArtifactBySlug(placeholderArtifact.slug, fixtures),
    undefined,
  );
  assert.equal(
    getDisplayableArtifactBySlug(hiddenByDefaultArtifact.slug, fixtures),
    undefined,
  );
  assert.equal(
    getDisplayableArtifactBySlug(publicDraftArtifact.slug, fixtures),
    undefined,
  );
  assert.equal(
    getDisplayableArtifactBySlug(underReviewArtifact.slug, fixtures),
    undefined,
  );
  assert.equal(
    getDisplayableArtifactBySlug(approvedPublicArtifact.slug, fixtures),
    approvedPublicArtifact,
  );
});

test("searches artifact names with trimming, partial matching, and case folding", () => {
  const fixtures = [
    createTestArtifact({
      id: "bronze-bell",
      slug: "bronze-bell",
      name: "测试铜铃",
    }),
    createTestArtifact({
      id: "stone-chime",
      slug: "stone-chime",
      name: "Test Stone Chime",
    }),
  ];

  assert.equal(filterArtifacts(fixtures, { query: "" }).length, 2);
  assert.equal(filterArtifacts(fixtures, { query: "   " }).length, 2);
  assert.deepEqual(
    filterArtifacts(fixtures, { query: "  测试铜铃  " }).map((artifact) => artifact.slug),
    ["bronze-bell"],
  );
  assert.deepEqual(
    filterArtifacts(fixtures, { query: "铜" }).map((artifact) => artifact.slug),
    ["bronze-bell"],
  );
  assert.deepEqual(
    filterArtifacts(fixtures, { query: "stone" }).map((artifact) => artifact.slug),
    ["stone-chime"],
  );
  assert.deepEqual(
    filterArtifacts(fixtures, { query: "STONE CHIME" }).map((artifact) => artifact.slug),
    ["stone-chime"],
  );
  assert.deepEqual(filterArtifacts(fixtures, { query: "不存在" }), []);
});

test("filters by period, material, type, and combined conditions", () => {
  const fixtures = [
    createTestArtifact({
      id: "artifact-a",
      slug: "artifact-a",
      name: "测试文物甲",
      period: "时期甲",
      material: "材质甲",
      artifactType: "类型甲",
    }),
    createTestArtifact({
      id: "artifact-b",
      slug: "artifact-b",
      name: "测试文物乙",
      period: "时期甲",
      material: "材质乙",
      artifactType: "类型乙",
    }),
    createTestArtifact({
      id: "artifact-c",
      slug: "artifact-c",
      name: "测试器物丙",
      period: "时期乙",
      material: "材质甲",
      artifactType: "类型乙",
    }),
  ];

  assert.deepEqual(
    filterArtifacts(fixtures, { period: "时期乙" }).map((artifact) => artifact.slug),
    ["artifact-c"],
  );
  assert.deepEqual(
    filterArtifacts(fixtures, { material: "材质乙" }).map((artifact) => artifact.slug),
    ["artifact-b"],
  );
  assert.deepEqual(
    filterArtifacts(fixtures, { artifactType: "类型甲" }).map((artifact) => artifact.slug),
    ["artifact-a"],
  );
  assert.deepEqual(
    filterArtifacts(fixtures, {
      period: "时期甲",
      material: "材质乙",
      artifactType: "类型乙",
    }).map((artifact) => artifact.slug),
    ["artifact-b"],
  );
  assert.deepEqual(
    filterArtifacts(fixtures, {
      query: "文物",
      period: "时期甲",
      artifactType: "类型乙",
    }).map((artifact) => artifact.slug),
    ["artifact-b"],
  );
  assert.equal(filterArtifacts(fixtures, {}).length, 3);
});

test("builds unique filter options and tolerates missing optional fields", () => {
  const fixtures = [
    createTestArtifact({
      id: "options-a",
      slug: "options-a",
      period: "重复时期",
      material: "重复材质",
      artifactType: "重复类型",
    }),
    createTestArtifact({
      id: "options-b",
      slug: "options-b",
      period: " 重复时期 ",
      material: "重复材质",
      artifactType: "其他类型",
    }),
    createTestArtifact({
      id: "options-missing",
      slug: "options-missing",
      period: undefined,
      material: undefined,
      artifactType: undefined,
    }),
    createTestArtifact({
      id: "options-internal",
      slug: "options-internal",
      period: "内部时期",
      material: "内部材质",
      artifactType: "内部类型",
      catalogVisibility: "internal",
    }),
  ];

  assert.deepEqual(getArtifactFilterOptions(fixtures), {
    periods: ["重复时期"],
    materials: ["重复材质"],
    artifactTypes: ["其他类型", "重复类型"],
  });
  assert.deepEqual(
    filterArtifacts(fixtures, { period: "不存在的时期" }),
    [],
  );
  assert.doesNotThrow(() =>
    filterArtifacts(fixtures, {
      query: "测试",
      period: "重复时期",
      material: "重复材质",
      artifactType: "重复类型",
    }),
  );
});

test("handles missing optional artifact fields without throwing", () => {
  const minimalArtifact = {
    id: "test-placeholder",
    slug: "test-placeholder",
    name: "测试占位记录",
    contentClassification: "digital_demonstration",
    reviewStatus: "placeholder",
    isDemo: true,
    isPlaceholder: true,
  };

  assert.deepEqual(getArtifactDisplayFacts(minimalArtifact), []);
  assert.equal(getPrimaryImage(minimalArtifact), undefined);
  assert.equal(getPrimaryAudio(minimalArtifact), undefined);
  assert.deepEqual(getSourcesForArtifact(minimalArtifact), []);
  assert.equal(getReviewStatusLabel(minimalArtifact.reviewStatus), "占位资料");
});

test("handles an empty catalog without inventing display or filter data", () => {
  assert.deepEqual(getDisplayableArtifacts([]), []);
  assert.deepEqual(filterArtifacts([], { query: "任意名称" }), []);
  assert.deepEqual(getArtifactFilterOptions([]), {
    periods: [],
    materials: [],
    artifactTypes: [],
  });
});

test("uses the reviewed local answer or the safe no-match response", () => {
  const questions = [
    {
      question: "测试问题是什么？",
      answer: "这是测试文件中的固定答案。",
      keywords: ["测试关键词"],
    },
  ];

  assert.equal(
    getLocalGuideAnswer(questions, "测试问题是什么？"),
    "这是测试文件中的固定答案。",
  );
  assert.equal(
    getLocalGuideAnswer(questions, "请解释测试关键词"),
    "这是测试文件中的固定答案。",
  );
  assert.equal(getLocalGuideAnswer(questions, "没有收录的问题"), GUIDE_NO_MATCH_ANSWER);
  assert.equal(getLocalGuideAnswer([], "没有问答数据"), GUIDE_NO_MATCH_ANSWER);
  assert.equal(
    getLocalGuideAnswer(
      [{ question: "空答案", answer: "", keywords: [] }],
      "空答案",
    ),
    GUIDE_NO_MATCH_ANSWER,
  );
});
