import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  artifacts,
  getCatalogArtifactBySlug,
  getCatalogArtifacts,
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
  validateArtifactCatalog,
} from "../app/heritage-data.ts";
import {
  GUIDE_NO_MATCH_ANSWER,
  getLocalGuideAnswer,
} from "../app/guide-utils.ts";
import {
  buildWaveformEnvelope,
  buildWaveformBars,
  computeWaveformEnvelope,
  fetchWaveformBytes,
  formatWaveformTime,
  getWaveformCacheKey,
  resolveWaveformSeekRatio,
  seekPercentToTime,
} from "../app/audio-waveform.ts";
import {
  MEMORIAL_CARD,
  buildMemorialFilename,
  composeMemorialNicknameLine,
  dataUrlToBlob,
  defaultCharScale,
  estimateTextWidth,
  fitTextBlock,
  formatMemorialDate,
  nextFocusIndex,
  sanitizeMemorialSlug,
  truncateToFit,
  wrapTextToLines,
} from "../app/memorial-card-text.ts";
import {
  applyTrackSourceToElement,
  attemptTrackPlay,
  buildHotspotAudioHint,
  buildPlaybackNotice,
  resolveHotspotAudioAction,
  resolveHotspotClickOutcome,
} from "../app/hotspot-audio-link.ts";

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
    reviewer: "测试审核人",
    reviewedAt: "2026-08-16",
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
  assert.match(html, /<title>贾湖骨笛数字展示｜豫音焕新声<\/title>/);
  assert.match(html, /property="og:title" content="豫音焕新声｜贾湖骨笛数字展示"/);
  assert.match(html, /property="og:locale" content="zh_CN"/);
  assert.match(html, /豫音焕新声/);
  assert.match(html, /贾湖骨笛/);
  assert.match(html, /2026 大学生创新训练计划/);
  assert.doesNotMatch(html, /项目概念验证/);
  assert.match(html, /多种孔数/);
  assert.match(html, /形制丰富/);
  assert.doesNotMatch(html, /当前为概念验证Demo/);
  assert.match(html, /文物总览/);
  assert.match(html, /查看全部文物/);
  assert.match(html, /data-artifact-card="jiahu-bone-flute"/);
  assert.match(html, /查看贾湖骨笛详情/);
  assert.match(html, /href="\/artifacts\/jiahu-bone-flute"/);
  assert.match(html, /待公布文物 002/);
  assert.match(html, /待公布文物 003/);
  assert.match(html, /查看整理进度/);
  assert.match(html, /待专业成员审核/);
  assert.doesNotMatch(html, /名称搜索|按年代或时期筛选|按材质筛选|按器物类型筛选|重置筛选|没有找到匹配的文物/);
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
  assert.match(html, /href="\/artifacts"/);
  assert.match(html, /内容分类/);
  assert.match(html, /考古事实/);
  assert.match(html, /内容审核状态/);
  assert.match(html, /待专业成员审核/);
  assert.match(html, /资料来源/);
  assert.doesNotMatch(html, /当前为概念验证Demo/);
  assert.match(html, /贾湖骨笛(?:<!-- -->)? · 交互模型/);
  assert.match(html, /合成音色占位演示/);
  assert.match(html, /数字讲解员/);
  assert.doesNotMatch(html, /文物总览 · COLLECTION/);
});

test("server-renders the standalone artifact catalog", async () => {
  const response = await render("/artifacts");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>文物总览｜豫音焕新声<\/title>/);
  assert.match(html, /文物总览/);
  assert.match(html, /名称搜索/);
  assert.match(html, /按年代或时期筛选/);
  assert.match(html, /按材质筛选/);
  assert.match(html, /按器物类型筛选/);
  assert.match(html, /重置筛选/);
  assert.match(html, /当前结果/);
  assert.match(html, /data-artifact-count="3"/);
  assert.match(html, /data-filtered-artifact-count="3"/);
  assert.match(html, /项目首页/);
  assert.match(html, /href="\/"/);
  assert.match(html, /href="\/artifacts\/jiahu-bone-flute"/);
  assert.doesNotMatch(html, /开始探索|一管骨笛/);
});

test("navigates from home through the catalog to a detail page and back", async () => {
  const homeHtml = await (await render("/")).text();
  assert.match(homeHtml, /href="\/artifacts"/);
  assert.match(homeHtml, /查看全部文物/);
  assert.match(homeHtml, /开始探索/);

  const catalogHtml = await (await render("/artifacts")).text();
  assert.match(catalogHtml, /href="\/artifacts\/jiahu-bone-flute"/);
  assert.doesNotMatch(catalogHtml, /开始探索/);

  const detailHtml = await (await render("/artifacts/jiahu-bone-flute")).text();
  assert.match(detailHtml, /返回文物总览/);
  assert.match(detailHtml, /href="\/artifacts"/);
  assert.doesNotMatch(detailHtml, /开始探索|一管骨笛/);
});

test("placeholder details link back to the artifact catalog", async () => {
  const response = await render("/artifacts/artifact-002");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /返回文物总览/);
  assert.match(html, /href="\/artifacts"/);
  assert.doesNotMatch(html, /一管骨笛/);
});

test("server-renders public placeholder details without professional modules", async () => {
  const response = await render("/artifacts/artifact-002");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /待公布文物 002/);
  assert.match(html, /资料整理中/);
  assert.match(html, /不会自动补充或推断年代、材质、用途、声音及研究结论/);
  assert.match(html, /(?:name="robots" content="[^"]*noindex|content="[^"]*noindex[^"]*" name="robots")/);
  assert.doesNotMatch(html, /内容分类|资料来源|GENERAL MODEL VIEWER|声音体验|数字讲解员/);

  const thirdResponse = await render("/artifacts/artifact-003");
  assert.equal(thirdResponse.status, 200);
  const thirdHtml = await thirdResponse.text();
  assert.match(thirdHtml, /待公布文物 003/);
  for (const placeholderHtml of [html, thirdHtml]) {
    assert.match(placeholderHtml, /coming-soon-hero-inner/);
  }
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
    assert.match(html, /href="\/artifacts"/);
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
    catalogPage,
    imageComponent,
    moduleErrorBoundary,
    guideUtilsSource,
    routePage,
    notFoundPage,
    routeErrorPage,
    packageJson,
    jiahuRecord,
    modelViewer,
    audioPlayer,
    waveformComponent,
    audioWaveformUtils,
    guideComponent,
    memorialCardComponent,
    memorialCardText,
    viteConfig,
  ] = await Promise.all([
    readFile(new URL("../app/heritage-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/HeritageDemo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ArtifactExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ArtifactDetail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactOverview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/artifacts/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactImage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ModuleErrorBoundary.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/guide-utils.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/artifacts/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/artifacts/[slug]/not-found.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/artifacts/[slug]/error.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/artifact-records/jiahu-bone-flute.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactModelViewer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactAudioPlayer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactWaveform.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/audio-waveform.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactGuide.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArtifactCommemorativeCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/memorial-card-text.ts", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    access(new URL("public/jiahu-bone-flute.jpg", root)),
  ]);

  assert.match(data, /export type Artifact =/);
  assert.match(data, /export const artifacts: Artifact\[\]/);
  assert.match(data, /contentClassification/);
  assert.match(data, /reviewStatus/);
  assert.match(jiahuRecord, /updatedAt: "2026-07-14"/);
  assert.match(jiahuRecord, /河南博物院/);
  assert.match(jiahuRecord, /doi\.org\/10\.1038\/43865/);
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
  assert.doesNotMatch(homePage, /ArtifactOverview/);
  assert.match(homePage, /getCatalogArtifacts/);
  assert.match(homePage, /ArtifactCard/);
  assert.match(homePage, /href="\/artifacts"/);
  assert.doesNotMatch(homePage, /ArtifactDetail|OrbitControls|createDemoWave|GuideChat/);
  assert.match(catalogPage, /ArtifactOverview/);
  assert.match(catalogPage, /getCatalogArtifacts/);
  assert.match(catalogPage, /title: "文物总览"/);
  assert.match(experience, /ArtifactDetail/);
  assert.match(experience, /lazy\(\(\) => import\("\.\/components\/ArtifactModelViewer"\)\)/);
  assert.match(modelViewer, /GLTFLoader/);
  assert.match(modelViewer, /data-module-fallback="3d"/);
  assert.match(audioPlayer, /createDemoWave/);
  assert.match(audioPlayer, /URL\.revokeObjectURL/);
  assert.match(audioPlayer, /data-module-fallback="audio"/);
  assert.match(guideComponent, /data-module-fallback="guide"/);
  assert.match(experience, /时间线资料待补充/);
  assert.match(experience, /资料来源待团队提供/);
  assert.match(experience, /05 · 资料来源/);
  assert.doesNotMatch(experience, /opensource-note|OPEN SOURCE FOUNDATION|AlumNet|Three\.js \/ MIT/);
  assert.match(experience, /ModuleErrorBoundary/);
  assert.match(routePage, /getDisplayableArtifactBySlug/);
  assert.match(routePage, /ArtifactExperience/);
  assert.match(routePage, /notFound\(\)/);
  assert.doesNotMatch(routePage, /贾湖|jiahu-bone-flute/);
  assert.match(notFoundPage, /未找到可展示的文物/);
  assert.match(notFoundPage, /href="\/artifacts"/);
  assert.match(routeErrorPage, /文物资料暂时无法读取/);
  assert.match(routeErrorPage, /href="\/artifacts"/);
  assert.match(jiahuRecord, /非文物扫描/);
  assert.match(jiahuRecord, /不是贾湖骨笛原件或复原件录音/);
  assert.doesNotMatch(jiahuRecord, /jiahu-demo-hotspot/);
  assert.match(modelViewer, /model-hotspot-layer/);
  assert.match(modelViewer, /localToWorld/);
  assert.match(modelViewer, /onSelectHotspot/);
  assert.match(modelViewer, /data-hotspot-count/);
  assert.match(modelViewer, /type="button"[\s\S]*?className="model-hotspot-marker"/);
  assert.match(modelViewer, /audioStatusHint/);
  assert.doesNotMatch(modelViewer, /关联音频已切换至下方播放器/);
  assert.match(modelViewer, /\{\s*Scene,\s*PerspectiveCamera,\s*WebGLRenderer[\s\S]*?\}\s*=\s*await import\("three"\)/);
  assert.doesNotMatch(modelViewer, /const THREE = await import\("three"\)/);
  assert.match(viteConfig, /find:\s*\/\^three\$\//);
  assert.match(viteConfig, /codeSplitting/);
  assert.match(viteConfig, /three-renderers/);
  assert.match(viteConfig, /three-core/);
  assert.match(audioPlayer, /selectedTrackId/);
  assert.match(audioPlayer, /onSelectTrack/);
  assert.match(audioPlayer, /playTrack/);
  assert.match(audioPlayer, /buildPlaybackNotice/);
  assert.match(audioPlayer, /audio-play-notice/);
  assert.match(audioPlayer, /<ArtifactWaveform/);
  assert.match(audioPlayer, /from "\.\.\/audio-waveform"/);
  assert.match(experience, /resolveHotspotClickOutcome/);
  assert.match(experience, /playerRef/);
  assert.match(experience, /audioStatusHint/);
  assert.match(audioWaveformUtils, /export function createDemoWave/);
  assert.match(audioWaveformUtils, /export function computeWaveformEnvelope/);
  assert.match(audioWaveformUtils, /export function getWaveformCacheKey/);
  assert.match(audioWaveformUtils, /export async function fetchWaveformBytes/);
  assert.match(waveformComponent, /decodeAudioData/);
  assert.match(waveformComponent, /buildWaveformEnvelope/);
  assert.match(waveformComponent, /onPointerDown/);
  assert.match(waveformComponent, /className="audio-waveform-canvas"[\s\S]*?aria-hidden="true"/);
  assert.match(waveformComponent, /type="range"/);
  assert.match(waveformComponent, /aria-valuetext/);
  assert.match(waveformComponent, /aria-label=/);
  assert.doesNotMatch(waveformComponent, /tabIndex=\{-1\}/);
  assert.match(experience, /ArtifactCommemorativeCard/);
  assert.match(memorialCardText, /projectName: "豫音焕新声"/);
  assert.match(memorialCardText, /formatMemorialDate/);
  assert.match(memorialCardComponent, /MEMORIAL_CARD/);
  assert.match(memorialCardComponent, /buildMemorialFilename/);
  assert.match(memorialCardComponent, /toBlob/);
  assert.match(memorialCardComponent, /getPrimaryImage/);
  assert.match(memorialCardComponent, /role="dialog"/);
  assert.match(memorialCardComponent, /aria-labelledby="memorial-dialog-title"/);
  assert.match(memorialCardComponent, /nextFocusIndex/);
  assert.match(memorialCardComponent, /dataUrlToBlob/);
  assert.match(memorialCardComponent, /fitTextBlock/);
  assert.match(memorialCardComponent, /MemorialCardFallback/);
  assert.match(memorialCardComponent, /canvasError/);
  assert.match(memorialCardComponent, /downloadError/);
  assert.match(memorialCardComponent, /primaryImage\?\.caption/);
  assert.doesNotMatch(memorialCardComponent, /localStorage|setItem|upload|fetch\(/);
  assert.doesNotMatch(memorialCardComponent, /artifact\.(period|material|dateDescription|reviewStatus)/);
  assert.match(experience, /MemorialCardFallback/);
  assert.match(experience, /selectedTrackId/);
  assert.match(experience, /onSelectHotspot/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("keeps the Jiahu artifact in the unified multi-artifact structure", () => {
  const allArtifacts = getAllArtifacts();
  assert.ok(Array.isArray(allArtifacts));
  assert.equal(allArtifacts.length, 3);

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
  assert.equal(getDisplayableArtifactBySlug("artifact-002"), undefined);
  assert.equal(getCatalogArtifactBySlug("artifact-002")?.reviewStatus, "placeholder");
  assert.deepEqual(getCatalogArtifacts().map((item) => item.slug), ["jiahu-bone-flute", "artifact-002", "artifact-003"]);

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

test("validates publication, references, media sources, and placeholder boundaries", () => {
  assert.deepEqual(validateArtifactCatalog(artifacts), []);

  const base = createTestArtifact({
    id: "validation-a",
    slug: "validation-a",
    displayIndex: "900",
    reviewer: undefined,
    reviewedAt: "2026/08/16",
    assetsReviewedAt: "16-08-2026",
    relatedArtifactIds: ["missing-artifact"],
    images: [{ id: "image-a", src: "/missing.jpg", alt: "测试图片", isPrimary: true }],
    model: { classification: "real_scan", hasRealFile: true, fallbackImageId: "missing-image" },
    audio: [{ id: "audio-a", name: "测试音频", classification: "original_artifact_recording", isBrowserGenerated: false }],
  });
  const duplicate = createTestArtifact({
    id: "validation-a",
    slug: "validation-a",
    displayIndex: "900",
  });
  const unsafePlaceholder = {
    ...createTestArtifact({ id: "placeholder-validation", slug: "placeholder-validation", displayIndex: "901" }),
    reviewStatus: "placeholder",
    isPlaceholder: true,
    period: "未经审核时期",
  };
  const issues = validateArtifactCatalog([base, duplicate, unsafePlaceholder]);
  const fields = issues.map((issue) => issue.field);
  assert.ok(fields.includes("id"));
  assert.ok(fields.includes("slug"));
  assert.ok(fields.includes("displayIndex"));
  assert.ok(fields.includes("review"));
  assert.ok(fields.includes("reviewedAt"));
  assert.ok(fields.includes("assetsReviewedAt"));
  assert.ok(fields.includes("assetReview"));
  assert.ok(fields.includes("relatedArtifactIds"));
  assert.ok(fields.includes("images"));
  assert.ok(fields.includes("model.glbPath"));
  assert.ok(fields.includes("model.fallbackImageId"));
  assert.ok(fields.includes("audio.filePath"));
  assert.ok(fields.includes("audio"));
  assert.ok(fields.includes("placeholder"));
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

test("computes a normalized min/max waveform envelope", () => {
  assert.deepEqual(
    computeWaveformEnvelope([], 8),
    Array.from({ length: 8 }, () => ({ min: 0, max: 0 })),
  );
  assert.deepEqual(
    computeWaveformEnvelope([new Float32Array(0)], 4),
    Array.from({ length: 4 }, () => ({ min: 0, max: 0 })),
  );
  assert.deepEqual(
    computeWaveformEnvelope([new Float32Array([-1, -0.5, 0, 0.5, 1])], 2),
    [
      { min: -1, max: 0 },
      { min: 0, max: 1 },
    ],
  );
  assert.deepEqual(
    computeWaveformEnvelope([new Float32Array([0, 0.5])], 1),
    [{ min: 0, max: 1 }],
  );
  assert.equal(
    computeWaveformEnvelope([new Float32Array([1, 0, -1])], 1)[0].min,
    -1,
  );
});

test("builds responsive centered waveform bars with bounded playback progress", () => {
  const envelope = [
    { min: 0, max: 0 },
    { min: -0.001, max: 0.001 },
    { min: -1, max: 1 },
    { min: -0.5, max: 0.5 },
  ];
  const bars = buildWaveformBars(envelope, 400, 200, 0.5);

  assert.equal(bars.length, 4);
  assert.deepEqual(bars.map((bar) => bar.x), [50, 150, 250, 350]);
  assert.equal(bars[0].bottom - bars[0].top, 2);
  assert.equal(bars[1].bottom - bars[1].top, 2);
  assert.equal(bars[2].bottom - bars[2].top, 84);
  assert.deepEqual(bars.map((bar) => bar.played), [true, true, false, false]);
  assert.ok(bars.every((bar) => bar.lineWidth === 3 && bar.top >= 0 && bar.bottom <= 200));

  const narrowBars = buildWaveformBars(envelope, 8, 80, 2);
  assert.equal(narrowBars[0].lineWidth, 1.04);
  assert.ok(narrowBars.every((bar) => bar.played));
  assert.ok(buildWaveformBars(envelope, 400, 200, -1).every((bar) => !bar.played));
  assert.ok(buildWaveformBars(envelope, 400, 200, Number.NaN).every((bar) => !bar.played));
  assert.deepEqual(buildWaveformBars([], 400, 200, 0.5), []);
  assert.deepEqual(buildWaveformBars(envelope, 0, 200, 0.5), []);
});

test("composes memorial card text and filenames", () => {
  assert.equal(MEMORIAL_CARD.projectName, "豫音焕新声");
  assert.equal(MEMORIAL_CARD.seal, "豫");
  assert.equal(formatMemorialDate(new Date(2026, 7, 16)), "2026年8月16日");
  assert.equal(composeMemorialNicknameLine(), "");
  assert.equal(composeMemorialNicknameLine("  小明  "), "致 · 小明");
  assert.equal(sanitizeMemorialSlug("Jiahu Bone Flute!"), "jiahu-bone-flute");
  assert.equal(sanitizeMemorialSlug("  "), "memorial");
  assert.equal(
    buildMemorialFilename("jiahu-bone-flute"),
    "豫音焕新声-jiahu-bone-flute-纪念卡.png",
  );
});

test("resolves hotspot audio actions without switching tracks for no-audio hotspots", () => {
  const tracks = [
    { id: "track-a", name: "音轨A", classification: "digitally_synthesized", isBrowserGenerated: true },
    { id: "track-b", name: "音轨B", classification: "digitally_synthesized", isBrowserGenerated: true },
  ];

  const switching = resolveHotspotAudioAction({ id: "h1", audioId: "track-b" }, tracks, "track-a");
  assert.equal(switching.kind, "play");
  if (switching.kind === "play") {
    assert.equal(switching.trackId, "track-b");
    assert.equal(switching.isSameTrack, false);
    assert.equal(switching.trackName, "音轨B");
  }

  const restarting = resolveHotspotAudioAction({ id: "h2", audioId: "track-b" }, tracks, "track-b");
  assert.equal(restarting.kind, "play");
  if (restarting.kind === "play") assert.equal(restarting.isSameTrack, true);

  assert.deepEqual(
    resolveHotspotAudioAction({ id: "h3" }, tracks, "track-a"),
    { kind: "noop", reason: "no_audio_id" },
  );
  assert.deepEqual(
    resolveHotspotAudioAction({ id: "h4", audioId: "missing" }, tracks, "track-a"),
    { kind: "noop", reason: "unknown_audio_id" },
  );
  assert.deepEqual(
    resolveHotspotAudioAction({ id: "h5", audioId: "track-a" }, [], undefined),
    { kind: "noop", reason: "unknown_audio_id" },
  );
  assert.deepEqual(
    resolveHotspotAudioAction(null, tracks, "track-a"),
    { kind: "noop", reason: "no_audio_id" },
  );
});

test("routes hotspot clicks to playTrack only when the hotspot has a matching audio track", () => {
  const tracks = [
    { id: "track-a", name: "音轨A", classification: "digitally_synthesized", isBrowserGenerated: true },
    { id: "track-b", name: "音轨B", classification: "digitally_synthesized", isBrowserGenerated: true },
  ];
  const playCalls = [];
  const player = {
    playTrack(trackId) {
      playCalls.push(trackId);
      return resolveHotspotAudioAction({ audioId: trackId }, tracks, "track-a");
    },
  };

  const outcome = resolveHotspotClickOutcome({ id: "h1", audioId: "track-b" }, tracks, "track-a", player);
  assert.equal(outcome.kind, "play");
  assert.deepEqual(playCalls, ["track-b"]);

  const noAudio = resolveHotspotClickOutcome({ id: "h2" }, tracks, "track-a", player);
  assert.deepEqual(noAudio, { kind: "noop", reason: "no_audio_id" });
  assert.deepEqual(playCalls, ["track-b"]);

  const missing = resolveHotspotClickOutcome({ id: "h3", audioId: "track-a" }, tracks, "track-a", null);
  assert.deepEqual(missing, { kind: "noop", reason: "player_unavailable" });
  assert.deepEqual(playCalls, ["track-b"]);
});

test("builds hotspot audio hints from the real action without claiming real recordings", () => {
  assert.equal(buildHotspotAudioHint({ kind: "noop", reason: "no_audio_id" }), "");
  assert.match(buildHotspotAudioHint({ kind: "noop", reason: "unknown_audio_id" }), /关联音频资料暂不可用/);
  assert.match(buildHotspotAudioHint({ kind: "noop", reason: "player_unavailable" }), /播放器暂不可用/);
  assert.match(buildHotspotAudioHint({ kind: "noop", reason: "play_failed" }), /未能开始播放/);

  const switched = buildHotspotAudioHint({
    kind: "play",
    trackId: "track-b",
    isSameTrack: false,
    trackName: "音轨B",
    classification: "digitally_synthesized",
  });
  assert.equal(switched, "已切换到关联音频并尝试播放：音轨B。");

  const replayed = buildHotspotAudioHint({
    kind: "play",
    trackId: "track-a",
    isSameTrack: true,
    trackName: "音轨A",
    classification: "digitally_synthesized",
  });
  assert.equal(replayed, "正在重播当前关联音频：音轨A。");

  for (const hint of [switched, replayed, buildHotspotAudioHint({ kind: "noop", reason: "play_failed" })]) {
    assert.doesNotMatch(hint, /真实音色|原件录音|原器录音/);
  }
});

test("builds playback notices that label synthetic audio without overstating it", () => {
  const synthetic = { id: "a", name: "合成", classification: "digitally_synthesized", isBrowserGenerated: true };
  const blocked = buildPlaybackNotice(Object.assign(new Error("blocked"), { name: "NotAllowedError" }), synthetic);
  assert.match(blocked, /浏览器阻止了自动播放/);
  assert.match(blocked, /数字合成演示音效，非原器或复原乐器录音/);
  assert.doesNotMatch(blocked, /真实音色|原件录音/);

  const failed = buildPlaybackNotice(
    Object.assign(new Error("decode"), { name: "NotSupportedError" }),
    { id: "b", name: "文件", classification: "reconstructed_instrument", isBrowserGenerated: false },
  );
  assert.match(failed, /音频未能开始播放/);
  assert.doesNotMatch(failed, /数字合成演示音效/);

  assert.equal(buildPlaybackNotice(Object.assign(new Error("interrupted"), { name: "AbortError" }), synthetic), undefined);
  assert.match(buildPlaybackNotice("unexpected", synthetic), /音频未能开始播放/);
});

test("applies the requested track source and revokes replaced object URLs", () => {
  const revoked = [];
  const element = { src: "", loaded: false, load() { this.loaded = true; } };
  let counter = 0;
  const create = () => `blob:demo-${++counter}`;
  const revoke = (url) => revoked.push(url);
  const synthetic = { id: "a", name: "合成", classification: "digitally_synthesized", isBrowserGenerated: true };

  const first = applyTrackSourceToElement(element, synthetic, create, revoke, undefined);
  assert.equal(element.src, "blob:demo-1");
  assert.equal(element.loaded, true);
  assert.equal(first.objectUrl, "blob:demo-1");

  const second = applyTrackSourceToElement(element, synthetic, create, revoke, first.objectUrl);
  assert.equal(element.src, "blob:demo-2");
  assert.deepEqual(revoked, ["blob:demo-1"]);

  const fileTrack = {
    id: "b",
    name: "文件",
    classification: "reconstructed_instrument",
    isBrowserGenerated: false,
    filePath: "/audio/b.wav",
  };
  const fileResult = applyTrackSourceToElement(element, fileTrack, create, revoke, second.objectUrl);
  assert.equal(element.src, "/audio/b.wav");
  assert.deepEqual(revoked, ["blob:demo-1", "blob:demo-2"]);
  assert.equal(fileResult.objectUrl, undefined);

  const broken = { id: "c", name: "坏", classification: "digitally_synthesized", isBrowserGenerated: false };
  assert.throws(
    () => applyTrackSourceToElement(element, broken, create, revoke, undefined),
    /Audio source is unavailable/,
  );
});

test("attempts playback from the click path and surfaces rejection locally", async () => {
  const rejections = [];
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  const blocked = {
    currentTime: 10,
    play() { return Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" })); },
  };
  attemptTrackPlay(blocked, { isSameTrack: true, onRejected: (error) => rejections.push(error) });
  assert.equal(blocked.currentTime, 0);
  await flush();
  assert.equal(rejections.length, 1);
  assert.equal(rejections[0].name, "NotAllowedError");

  const resolving = { currentTime: 10, play() { return Promise.resolve(); } };
  attemptTrackPlay(resolving, { isSameTrack: false, onRejected: (error) => rejections.push(error) });
  assert.equal(resolving.currentTime, 10);
  await flush();
  assert.equal(rejections.length, 1);

  const throwing = { currentTime: 5, play() { throw new Error("sync failure"); } };
  attemptTrackPlay(throwing, { isSameTrack: false, onRejected: (error) => rejections.push(error) });
  assert.equal(rejections.length, 2);
  assert.equal(rejections[1].message, "sync failure");

  const voidResult = { currentTime: 5, play() {} };
  attemptTrackPlay(voidResult, { isSameTrack: true, onRejected: (error) => rejections.push(error) });
  assert.equal(voidResult.currentTime, 0);
  assert.equal(rejections.length, 2);
});

test("builds waveform cache keys from source info so ids cannot collide across artifacts", () => {
  const browserTrack = { id: "demo", isBrowserGenerated: true };
  const fileTrackA = { id: "demo", isBrowserGenerated: false, filePath: "/artifacts/a/audio.wav" };
  const fileTrackB = { id: "demo", isBrowserGenerated: false, filePath: "/artifacts/b/audio.wav" };

  assert.equal(
    getWaveformCacheKey(browserTrack),
    getWaveformCacheKey({ id: "demo", isBrowserGenerated: true }),
  );
  assert.notEqual(getWaveformCacheKey(browserTrack), getWaveformCacheKey(fileTrackA));
  assert.notEqual(getWaveformCacheKey(fileTrackA), getWaveformCacheKey(fileTrackB));
  assert.equal(
    getWaveformCacheKey(fileTrackA),
    getWaveformCacheKey({ id: "demo", isBrowserGenerated: false, filePath: "/artifacts/a/audio.wav" }),
  );
});

test("formats waveform time labels for accessible progress text", () => {
  assert.equal(formatWaveformTime(0), "0:00");
  assert.equal(formatWaveformTime(65), "1:05");
  assert.equal(formatWaveformTime(600.9), "10:00");
  assert.equal(formatWaveformTime(Number.NaN), "0:00");
  assert.equal(formatWaveformTime(-3), "0:00");
});

test("fetches waveform bytes only after checking response.ok", async () => {
  const okResponse = { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
  const failResponse = { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    return failResponse;
  };

  await assert.rejects(
    () => fetchWaveformBytes("/missing.wav", { fetchImpl: fakeFetch }),
    /波形数据加载失败：404/,
  );
  assert.equal(calls.length, 1);

  const bytes = await fetchWaveformBytes("/ok.wav", { fetchImpl: async () => okResponse });
  assert.equal(bytes.byteLength, 4);
});

test("maps pointer positions and slider percentages into safe seek targets", () => {
  assert.equal(resolveWaveformSeekRatio(10, 0, 100), 0.1);
  assert.equal(resolveWaveformSeekRatio(50, 10, 80), 0.5);
  assert.equal(resolveWaveformSeekRatio(-5, 0, 100), 0);
  assert.equal(resolveWaveformSeekRatio(150, 0, 100), 1);
  assert.equal(resolveWaveformSeekRatio(50, 0, 0), 0);

  assert.equal(seekPercentToTime(50, 10), 5);
  assert.equal(seekPercentToTime(0, 10), 0);
  assert.equal(seekPercentToTime(100, 10), 10);
  assert.equal(seekPercentToTime(150, 10), 10);
  assert.equal(seekPercentToTime(-5, 10), 0);
  assert.equal(seekPercentToTime(50, Number.NaN), undefined);
  assert.equal(seekPercentToTime(50, -1), undefined);
});

test("builds and caches envelopes per track source without cross-track leakage", async () => {
  const cache = new Map();
  const trackA = { id: "demo", isBrowserGenerated: false, filePath: "/a.wav" };
  const trackB = { id: "demo", isBrowserGenerated: false, filePath: "/b.wav" };
  const calls = [];
  const slowLoad = async () => {
    calls.push("a-load");
    await new Promise((resolve) => setTimeout(resolve, 20));
    return new ArrayBuffer(2);
  };
  const fastLoad = async () => {
    calls.push("b-load");
    return new ArrayBuffer(2);
  };

  const [envelopeA, envelopeB] = await Promise.all([
    buildWaveformEnvelope(trackA, {
      cache,
      loadBytes: slowLoad,
      decode: async () => { calls.push("a-decode"); return { channels: [new Float32Array([-1, 0, 1])] }; },
      bucketCount: 4,
    }),
    buildWaveformEnvelope(trackB, {
      cache,
      loadBytes: fastLoad,
      decode: async () => { calls.push("b-decode"); return { channels: [new Float32Array([0, 0.5, 0.25])] }; },
      bucketCount: 4,
    }),
  ]);

  assert.equal(cache.size, 2);
  assert.equal(envelopeA.length, 4);
  assert.equal(envelopeB.length, 4);
  assert.deepEqual(cache.get(getWaveformCacheKey(trackA)), envelopeA);
  assert.deepEqual(cache.get(getWaveformCacheKey(trackB)), envelopeB);
  assert.notDeepEqual(envelopeA, envelopeB);

  const callsBeforeCacheHit = calls.length;
  const cached = await buildWaveformEnvelope(trackA, {
    cache,
    loadBytes: async () => { throw new Error("cache hit must not load"); },
    decode: async () => { throw new Error("cache hit must not decode"); },
    bucketCount: 4,
  });
  assert.deepEqual(cached, envelopeA);
  assert.equal(calls.length, callsBeforeCacheHit);
});

test("rejects envelope building when decoding fails so the UI can degrade locally", async () => {
  const cache = new Map();
  await assert.rejects(
    () => buildWaveformEnvelope(
      { id: "broken", isBrowserGenerated: true },
      {
        cache,
        loadBytes: async () => new ArrayBuffer(2),
        decode: async () => { throw new Error("decode failed"); },
        bucketCount: 4,
      },
    ),
    /decode failed/,
  );
  assert.equal(cache.size, 0);
});

test("wraps and scales long Chinese texts inside the memorial card safe area", () => {
  const longName = "新石器时代贾湖遗址出土的多音孔骨质吹奏乐器数字展示纪念卡";
  const nameBlock = fitTextBlock(longName, 856, 2, 56, 34);
  assert.ok(nameBlock.lines.length <= 2);
  assert.ok(nameBlock.fontSize >= 34 && nameBlock.fontSize <= 56);
  for (const line of nameBlock.lines) {
    assert.ok(estimateTextWidth(line, nameBlock.fontSize, defaultCharScale) <= 856);
  }

  const nicknameBlock = fitTextBlock(`致 · ${"测".repeat(24)}`, 856, 2, 44, 28);
  assert.ok(nicknameBlock.lines.length <= 2);
  for (const line of nicknameBlock.lines) {
    assert.ok(estimateTextWidth(line, nicknameBlock.fontSize, defaultCharScale) <= 856);
  }

  const creditBlock = fitTextBlock(
    "ASHillocks / Wikimedia Commons / CC BY-SA 4.0，同类文物照片摄于漯河市博物馆",
    856,
    2,
    20,
    14,
  );
  assert.ok(creditBlock.lines.length <= 2);
  for (const line of creditBlock.lines) {
    assert.ok(estimateTextWidth(line, creditBlock.fontSize, defaultCharScale) <= 856);
  }

  assert.deepEqual(fitTextBlock("", 856, 2, 56, 34), { lines: [], fontSize: 56, truncated: false });
});

test("truncates single-line texts with an ellipsis inside the safe area", () => {
  const longSlogan = "让河南音乐文物重新发声并让更多人听见跨越九千年的声音";
  const fitted = truncateToFit(longSlogan, 856, 38);
  assert.ok(estimateTextWidth(fitted, 38, defaultCharScale) <= 856);
  assert.ok(fitted.endsWith("…") || fitted === longSlogan);
  assert.equal(truncateToFit("短文本", 856, 38), "短文本");
  assert.equal(truncateToFit("", 856, 38), "");
});

test("estimates CJK and ASCII text widths deterministically", () => {
  assert.equal(estimateTextWidth("贾湖", 56, defaultCharScale), 112);
  assert.ok(Math.abs(estimateTextWidth("ab", 56, defaultCharScale) - 61.6) < 1e-9);
  assert.ok(Math.abs(estimateTextWidth("a b", 56, defaultCharScale) - 56 * (0.55 + 0.32 + 0.55)) < 1e-9);
  assert.deepEqual(wrapTextToLines("一二三四五六", 224, 56), ["一二三四", "五六"]);
  assert.deepEqual(wrapTextToLines("ab cd", 168, 56), ["ab cd"]);
  assert.deepEqual(wrapTextToLines("ab cd", 140, 56), ["ab c", "d"]);
});

test("wraps dialog focus movement inside the modal", () => {
  assert.equal(nextFocusIndex(0, 4, "next"), 1);
  assert.equal(nextFocusIndex(3, 4, "next"), 0);
  assert.equal(nextFocusIndex(0, 4, "previous"), 3);
  assert.equal(nextFocusIndex(-1, 4, "next"), 0);
  assert.equal(nextFocusIndex(-1, 4, "previous"), 3);
  assert.equal(nextFocusIndex(0, 0, "next"), -1);
});

test("converts data URLs to blobs with the declared mime type", () => {
  const blob = dataUrlToBlob("data:image/png;base64,AAECAw==");
  assert.equal(blob.type, "image/png");
  assert.equal(blob.size, 4);
  assert.throws(() => dataUrlToBlob("not-a-data-url"), /Invalid data URL/);
});
