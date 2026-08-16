import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
  assert.match(registry, /import \{ artifact004 \} from "\.\/stable-slug\.ts"/);
  assert.match(registry, /\sartifact004,/);
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
  await mkdir(imageDirectory, { recursive: true });
  await writeFile(path.join(imageDirectory, "primary.webp"), "test");
  const artifact = {
    id: "artifact-001", slug: "existing", displayIndex: "001", name: "完整测试文物",
    period: "测试时期", summary: "测试摘要", contentVersion: "1.0",
    contentClassification: "archaeological_fact", reviewStatus: "published",
    reviewer: "测试审核人", reviewedAt: "2026-08-16", isDemo: false, catalogVisibility: "public",
    sources: [{ id: "source-1", name: "测试来源", href: "https://example.test/source" }],
    fieldReferences: [
      { field: "period", sourceIds: ["source-1"] },
      { field: "summary", sourceIds: ["source-1"], locator: "第 1 页" },
    ],
    images: [{ id: "primary", src: "/artifacts/existing/images/primary.webp", alt: "测试图", sourceId: "source-1", authorizationStatus: "authorized" }],
  };
  const result = await checkArtifactToolkit({ root, artifacts: [artifact] });
  assert.deepEqual(result, { errors: [], warnings: [] });
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
  assert.match(report, /字段 period 缺少字段级引用/);
  assert.match(report, /不支持的图片格式/);
  assert.match(report, /声明的素材文件不存在/);
  assert.match(report, /公开素材授权状态不完整/);
  assert.match(report, /文件未被任何文物记录引用/);
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
