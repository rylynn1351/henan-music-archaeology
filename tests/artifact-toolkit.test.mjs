import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkArtifactToolkit, formatArtifactCheckReport } from "../scripts/artifact-check.mjs";
import { scaffoldArtifact, validateArtifactArguments } from "../scripts/artifact-new.mjs";

async function fixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "artifact-toolkit-"));
  const records = path.join(root, "app", "artifact-records");
  await mkdir(records, { recursive: true });
  await mkdir(path.join(root, "public"), { recursive: true });
  await writeFile(path.join(records, "existing.ts"), 'export const artifact001 = { id: "artifact-001", slug: "existing", displayIndex: "001" };\n');
  await writeFile(path.join(records, "index.ts"), `// artifact-registry-imports:start
import { artifact001 } from "./existing.ts";
// artifact-registry-imports:end

export const artifactRegistry = [
  // artifact-registry-items:start
  artifact001,
  // artifact-registry-items:end
];
`);
  return root;
}

test("artifact:new generates and registers a private draft", async (t) => {
  const root = await fixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await scaffoldArtifact({ root, index: "004", slug: "stable-slug", name: "文物名称" });
  const record = await readFile(result.targetPath, "utf8");
  const registry = await readFile(result.registryPath, "utf8");
  assert.match(record, /id: "artifact-004"/);
  assert.match(record, /slug: "stable-slug"/);
  assert.match(record, /reviewStatus: "draft"/);
  assert.match(record, /catalogVisibility: "internal"/);
  assert.match(record, /fieldReferences: \[\]/);
  assert.match(record, /assetReviewer: undefined/);
  assert.match(record, /assetsReviewedAt: undefined/);
  assert.match(registry, /import \{ artifact004 \} from "\.\/stable-slug\.ts"/);
  assert.match(registry, /\n  artifact004,\n  \/\/ artifact-registry-items:end/);
});

test("artifact:new rejects invalid or duplicate identifiers without changing files", async (t) => {
  const root = await fixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const registryPath = path.join(root, "app", "artifact-records", "index.ts");
  const before = await readFile(registryPath, "utf8");
  assert.throws(() => validateArtifactArguments({ index: "4", slug: "Bad Slug", name: "" }), /三位数字/);
  await assert.rejects(() => scaffoldArtifact({ root, index: "001", slug: "another", name: "重复编号" }), /编号 001 已存在/);
  await writeFile(path.join(root, "app", "artifact-records", "alias.ts"), 'export const alias = { id: "artifact-008", slug: "duplicate-slug", displayIndex: "008" };\n');
  await assert.rejects(() => scaffoldArtifact({ root, index: "004", slug: "duplicate-slug", name: "重复 slug" }), /slug duplicate-slug 已存在/);
  await writeFile(path.join(root, "app", "artifact-records", "occupied.ts"), "保留原文件");
  await assert.rejects(() => scaffoldArtifact({ root, index: "004", slug: "occupied", name: "目标占用" }), /目标文件已存在/);
  assert.equal(await readFile(registryPath, "utf8"), before);
  assert.equal(await readFile(path.join(root, "app", "artifact-records", "occupied.ts"), "utf8"), "保留原文件");
});

test("artifact:check accepts a complete reviewed record and real files", async (t) => {
  const root = await fixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const imageDirectory = path.join(root, "public", "artifacts", "existing", "images");
  const modelDirectory = path.join(root, "public", "artifacts", "existing", "models");
  const audioDirectory = path.join(root, "public", "artifacts", "existing", "audio");
  const fixtures = path.join(import.meta.dirname, "fixtures", "artifact-media");
  await Promise.all([imageDirectory, modelDirectory, audioDirectory].map((directory) => mkdir(directory, { recursive: true })));
  await Promise.all([
    copyFile(path.join(fixtures, "test-only-pixel.png"), path.join(imageDirectory, "primary.png")),
    copyFile(path.join(fixtures, "test-only-triangle.glb"), path.join(modelDirectory, "model.glb")),
    copyFile(path.join(fixtures, "test-only-tone.wav"), path.join(audioDirectory, "track.wav")),
  ]);
  const artifact = {
    id: "artifact-001", slug: "existing", displayIndex: "001", name: "完整测试文物",
    period: "测试时期", summary: "测试摘要", contentVersion: "1.0",
    contentClassification: "archaeological_fact", reviewStatus: "published",
    reviewer: "测试审核人", reviewedAt: "2026-08-16", isDemo: false, catalogVisibility: "public",
    assetReviewer: "测试素材审核人", assetsReviewedAt: "2026-08-16",
    sources: [{ id: "source-1", name: "测试来源", href: "https://example.test/source" }],
    fieldReferences: [
      { field: "period", sourceIds: ["source-1"] },
      { field: "summary", sourceIds: ["source-1"], locator: "第 1 页" },
    ],
    images: [{ id: "primary", src: "/artifacts/existing/images/primary.png", alt: "测试图", sourceId: "source-1", authorizationStatus: "authorized" }],
    model: { classification: "artistic_creation", glbPath: "/artifacts/existing/models/model.glb", hasRealFile: true, scale: 1, unit: "m", rotation: [0, 0, 0], fallbackImageId: "primary", sourceId: "source-1", authorizationStatus: "authorized", notice: "测试模型，非文物扫描" },
    audio: [{ id: "track", name: "测试数字音", classification: "digitally_synthesized", filePath: "/artifacts/existing/audio/track.wav", isBrowserGenerated: false, sourceId: "source-1", authorizationStatus: "authorized", description: "测试文件音频，不代表文物音色" }],
  };
  const result = await checkArtifactToolkit({ root, artifacts: [artifact] });
  assert.deepEqual(result, { errors: [], warnings: [] });
  assert.equal((await readFile(path.join(modelDirectory, "model.glb"))).subarray(0, 4).toString("ascii"), "glTF");
  assert.equal((await readFile(path.join(audioDirectory, "track.wav"))).subarray(0, 4).toString("ascii"), "RIFF");
  assert.match(formatArtifactCheckReport(result), /预检通过/);
});

test("artifact:check reports missing registration, citations, review data, assets, and unused files in Chinese", async (t) => {
  const root = await fixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const records = path.join(root, "app", "artifact-records");
  await writeFile(path.join(records, "unregistered.ts"), "export const unregistered = {};\n");
  const unusedDirectory = path.join(root, "public", "artifacts", "unused", "images");
  await mkdir(unusedDirectory, { recursive: true });
  await writeFile(path.join(unusedDirectory, "orphan.png"), "test");
  const artifact = {
    id: "artifact-001", slug: "existing", displayIndex: "001", name: "不完整测试文物",
    period: "测试时期", contentClassification: "archaeological_fact", reviewStatus: "approved",
    isDemo: false, catalogVisibility: "public", sources: [], fieldReferences: [],
    images: [{ id: "bad", src: "/artifacts/existing/images/bad.bmp", alt: "测试图", authorizationStatus: "pending" }],
  };
  const result = await checkArtifactToolkit({ root, artifacts: [artifact] });
  const report = formatArtifactCheckReport(result);
  assert.match(report, /数据文件 unregistered\.ts 尚未注册/);
  assert.match(report, /正式公开记录缺少资料版本/);
  assert.match(report, /缺少素材审核人/);
  assert.match(report, /缺少素材审核日期/);
  assert.match(report, /字段 period 缺少字段级引用/);
  assert.match(report, /不支持的图片格式/);
  assert.match(report, /声明的素材文件不存在/);
  assert.match(report, /公开素材授权状态不完整/);
  assert.match(report, /文件未被任何文物记录引用/);
});

test("artifact:check allows reviewed text-only records without asset review", async (t) => {
  const root = await fixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifact = {
    id: "artifact-001", slug: "existing", displayIndex: "001", name: "纯文字测试文物",
    summary: "测试摘要", contentVersion: "1.0", contentClassification: "archaeological_fact",
    reviewStatus: "approved", reviewer: "内容审核人", reviewedAt: "2026-08-16",
    isDemo: false, catalogVisibility: "public",
    sources: [{ id: "source-1", name: "测试网页", href: "https://example.test/source" }],
    fieldReferences: [{ field: "summary", sourceIds: ["source-1"] }],
  };
  const result = await checkArtifactToolkit({ root, artifacts: [artifact] });
  assert.deepEqual(result, { errors: [], warnings: [] });
});

test("artifact:check validates review dates and formal source completeness", async (t) => {
  const root = await fixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifact = {
    id: "artifact-001", slug: "existing", displayIndex: "001", name: "审核格式测试",
    contentVersion: "1.0", contentClassification: "archaeological_fact", reviewStatus: "approved",
    reviewer: "内容审核人", reviewedAt: "2026/08/16", isDemo: false, catalogVisibility: "public",
    sources: [{ id: "source-1", name: "无出版信息来源" }], fieldReferences: [],
  };
  const report = formatArtifactCheckReport(await checkArtifactToolkit({ root, artifacts: [artifact] }));
  assert.match(report, /内容审核日期必须使用 YYYY-MM-DD 格式/);
  assert.match(report, /正式来源必须填写出版物信息或可核对链接/);
});

test("artifact:check blocks public files accidentally placed under an internal draft", async (t) => {
  const root = await fixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const accidentalDirectory = path.join(root, "public", "artifacts", "private-draft", "images");
  await mkdir(accidentalDirectory, { recursive: true });
  await writeFile(path.join(accidentalDirectory, "raw.jpg"), "private");
  const result = await checkArtifactToolkit({ root, artifacts: [{
    id: "artifact-009", slug: "private-draft", name: "内部草稿", contentVersion: "0.1-draft",
    contentClassification: "archaeological_fact", reviewStatus: "draft", isDemo: false, catalogVisibility: "internal",
  }] });
  assert.ok(result.errors.some((item) => item.message.includes("内部草稿的素材被放入公开目录")));
});
