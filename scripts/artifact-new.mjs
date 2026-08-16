import { access, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_PATTERN = /^\d{3}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMPORT_START = "// artifact-registry-imports:start";
const IMPORT_END = "// artifact-registry-imports:end";
const ITEM_START = "// artifact-registry-items:start";
const ITEM_END = "// artifact-registry-items:end";

export function parseArtifactArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!["--index", "--slug", "--name"].includes(key)) throw new Error(`未知参数：${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${key} 缺少值`);
    values[key.slice(2)] = value;
    index += 1;
  }
  return values;
}

export function validateArtifactArguments({ index, slug, name }) {
  if (!INDEX_PATTERN.test(index ?? "")) throw new Error("编号必须是三位数字，例如 004");
  if (!SLUG_PATTERN.test(slug ?? "") || slug.length > 80) throw new Error("slug 只能使用小写英文字母、数字和单个连字符，且不超过 80 个字符");
  if (!name?.trim()) throw new Error("名称不能为空");
}

function insertBeforeMarker(source, endMarker, line) {
  const markerIndex = source.indexOf(endMarker);
  if (markerIndex < 0) throw new Error(`注册表缺少标记：${endMarker}`);
  const markerLineStart = source.lastIndexOf("\n", markerIndex - 1) + 1;
  return `${source.slice(0, markerLineStart)}${line}\n${source.slice(markerLineStart)}`;
}

function buildRecord({ index, slug, name }) {
  return `import type { Artifact } from "../heritage-data";

/** 由 artifact:new 生成。id、slug 和 displayIndex 发布后不得修改。 */
export const artifact${index}: Artifact = {
  id: "artifact-${index}",
  slug: ${JSON.stringify(slug)},
  displayIndex: "${index}",
  name: ${JSON.stringify(name.trim())},
  contentVersion: "0.1-draft",
  period: undefined,
  dateDescription: undefined,
  discoveryDate: undefined,
  material: undefined,
  artifactType: undefined,
  discoveryLocation: undefined,
  currentCollection: undefined,
  dimensions: undefined,
  summary: undefined,
  detailedDescription: undefined,
  researchNote: undefined,
  timeline: [],
  questions: [],
  sources: [],
  fieldReferences: [],
  images: [],
  model: undefined,
  audio: [],
  contentClassification: "archaeological_fact",
  reviewStatus: "draft",
  reviewer: undefined,
  reviewedAt: undefined,
  assetReviewer: undefined,
  assetsReviewedAt: undefined,
  updatedAt: undefined,
  isDemo: false,
  isPlaceholder: false,
  catalogVisibility: "internal",
};
`;
}

async function pathExists(target) {
  try { await access(target); return true; } catch { return false; }
}

export async function scaffoldArtifact({ root, index, slug, name }) {
  validateArtifactArguments({ index, slug, name });
  const recordsDirectory = path.join(root, "app", "artifact-records");
  const registryPath = path.join(recordsDirectory, "index.ts");
  const targetPath = path.join(recordsDirectory, `${slug}.ts`);
  const registrySource = await readFile(registryPath, "utf8");
  if (!registrySource.includes(IMPORT_START) || !registrySource.includes(IMPORT_END) || !registrySource.includes(ITEM_START) || !registrySource.includes(ITEM_END)) {
    throw new Error("注册表格式不受支持：缺少 artifact-registry 标记");
  }
  if (await pathExists(targetPath)) throw new Error(`目标文件已存在：${path.relative(root, targetPath)}`);

  const entries = await readdir(recordsDirectory, { withFileTypes: true });
  const recordSources = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => readFile(path.join(recordsDirectory, entry.name), "utf8")));
  const combined = recordSources.join("\n");
  if (new RegExp(`\\bid:\\s*[\"']artifact-${index}[\"']`).test(combined)) throw new Error(`编号 ${index} 已存在`);
  if (new RegExp(`\\bdisplayIndex:\\s*[\"']${index}[\"']`).test(combined)) throw new Error(`显示编号 ${index} 已存在`);
  if (new RegExp(`\\bslug:\\s*[\"']${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\"']`).test(combined)) throw new Error(`slug ${slug} 已存在`);

  const importLine = `import { artifact${index} } from "./${slug}.ts";`;
  const itemLine = `  artifact${index},`;
  let nextRegistry = insertBeforeMarker(registrySource, IMPORT_END, importLine);
  nextRegistry = insertBeforeMarker(nextRegistry, ITEM_END, itemLine);
  const nonce = `${process.pid}-${Date.now()}`;
  const recordTemp = `${targetPath}.${nonce}.tmp`;
  const registryTemp = `${registryPath}.${nonce}.tmp`;
  await writeFile(recordTemp, buildRecord({ index, slug, name }), { encoding: "utf8", flag: "wx" });
  await writeFile(registryTemp, nextRegistry, { encoding: "utf8", flag: "wx" });
  try {
    await rename(recordTemp, targetPath);
    await rename(registryTemp, registryPath);
  } catch (error) {
    await rm(recordTemp, { force: true });
    await rm(registryTemp, { force: true });
    await rm(targetPath, { force: true });
    throw error;
  }
  return { targetPath, registryPath };
}

async function main() {
  try {
    const args = parseArtifactArguments(process.argv.slice(2));
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const result = await scaffoldArtifact({ root, ...args });
    console.log(`已生成内部草稿：${path.relative(root, result.targetPath)}`);
    console.log("下一步：\n1. 按 Word 资料逐项录入并保留“待确认”\n2. 为专业字段填写 fieldReferences\n3. 仅将审核授权完成的素材放入 public/artifacts/<slug>/\n4. 运行 npm run artifact:check\n5. 人工核对审核记录后再修改发布状态");
  } catch (error) {
    console.error(`创建失败：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
