import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED = {
  image: new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]),
  model: new Set([".glb"]),
  audio: new Set([".mp3", ".wav", ".ogg", ".m4a"]),
};
const AUTHORIZED = new Set(["open_license", "authorized"]);

function issue(artifactId, field, message, severity = "error") { return { artifactId, field, message, severity }; }
async function exists(target) { try { return (await stat(target)).isFile(); } catch { return false; } }
async function listFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? listFiles(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
    return nested.flat();
  } catch { return []; }
}

function publicFile(root, urlPath) {
  if (!urlPath?.startsWith("/") || urlPath.includes("..")) return undefined;
  const publicRoot = path.resolve(root, "public");
  const target = path.resolve(publicRoot, `.${urlPath}`);
  return target.startsWith(`${publicRoot}${path.sep}`) ? target : undefined;
}

export async function checkArtifactToolkit({ root, artifacts, catalogIssues = [] }) {
  const errors = catalogIssues.map((item) => issue(item.artifactId, item.field, item.message));
  const warnings = [];
  const recordsDirectory = path.join(root, "app", "artifact-records");
  const registryPath = path.join(recordsDirectory, "index.ts");
  const registry = await readFile(registryPath, "utf8");
  const recordFiles = (await readdir(recordsDirectory)).filter((name) => name.endsWith(".ts") && !["index.ts", "template.ts"].includes(name));
  const imports = [...registry.matchAll(/import\s+\{\s*([A-Za-z0-9_]+)\s*\}\s+from\s+["']\.\/([^"']+\.ts)["'];/g)]
    .map((match) => ({ symbol: match[1], file: match[2] }));
  const importedFiles = new Set(imports.map((item) => item.file));
  const importedSources = new Map();
  for (const item of imports) {
    const sourcePath = path.join(recordsDirectory, item.file);
    try {
      importedSources.set(item.file, await readFile(sourcePath, "utf8"));
      const itemPattern = new RegExp(`\\b${item.symbol}\\s*,`);
      if (!itemPattern.test(registry)) errors.push(issue("注册表", item.symbol, `已导入 ${item.symbol}，但未加入 artifactRegistry`));
    } catch {
      errors.push(issue("注册表", item.file, `注册表引用的数据文件不存在：${item.file}`));
    }
  }
  for (const file of recordFiles) {
    if (!importedFiles.has(file)) errors.push(issue("注册表", file, `数据文件 ${file} 尚未注册`));
  }
  for (const artifact of artifacts) {
    const recordMatched = [...importedSources.values()].some((source) => source.includes(`id: "${artifact.id}"`) && source.includes(`slug: "${artifact.slug}"`));
    if (!recordMatched) errors.push(issue(artifact.id, "registration", "文物记录未出现在已注册的数据文件中"));
  }

  const referencedPublicFiles = new Set();
  const validateAsset = async (artifact, field, urlPath, kind, authorizationStatus) => {
    if (!urlPath) return;
    const target = publicFile(root, urlPath);
    if (!target) { errors.push(issue(artifact.id, field, `素材路径无效：${urlPath}`)); return; }
    referencedPublicFiles.add(path.normalize(target));
    const extension = path.extname(target).toLowerCase();
    if (!SUPPORTED[kind].has(extension)) errors.push(issue(artifact.id, field, `不支持的${kind === "image" ? "图片" : kind === "model" ? "模型" : "音频"}格式：${extension || "无扩展名"}`));
    if (!(await exists(target))) errors.push(issue(artifact.id, field, `声明的素材文件不存在：${urlPath}`));
    if (artifact.catalogVisibility === "public" && ["approved", "published"].includes(artifact.reviewStatus) && !AUTHORIZED.has(authorizationStatus)) {
      errors.push(issue(artifact.id, field, `公开素材授权状态不完整：${authorizationStatus ?? "未填写"}`));
    }
    if (artifact.catalogVisibility === "public" && ["approved", "published"].includes(artifact.reviewStatus)) {
      const folder = kind === "image" ? "images" : kind === "model" ? "models" : "audio";
      const expectedPrefix = `/artifacts/${artifact.slug}/${folder}/`;
      if (!urlPath.startsWith(expectedPrefix)) errors.push(issue(artifact.id, field, `正式素材必须位于 ${expectedPrefix}`));
      const relativeName = urlPath.slice(expectedPrefix.length);
      if (!relativeName || !/^[a-z0-9][a-z0-9._/-]*$/.test(relativeName)) errors.push(issue(artifact.id, field, "正式素材路径只能使用稳定的小写英文、数字、点、连字符和下划线"));
    }
  };

  for (const artifact of artifacts) {
    const formalPublic = artifact.catalogVisibility === "public" && ["approved", "published"].includes(artifact.reviewStatus);
    const sourceMap = new Map();
    for (const source of artifact.sources ?? []) {
      if (sourceMap.has(source.id)) errors.push(issue(artifact.id, "sources.id", `来源 ID ${source.id} 重复`));
      sourceMap.set(source.id, source);
    }
    for (const reference of artifact.fieldReferences ?? []) {
      for (const sourceId of reference.sourceIds) if (!sourceMap.has(sourceId)) errors.push(issue(artifact.id, `fieldReferences.${reference.field}`, `引用的来源 ${sourceId} 不存在`));
    }
    if (formalPublic) {
      if (!artifact.contentVersion) errors.push(issue(artifact.id, "contentVersion", "正式公开记录缺少资料版本"));
      if (!artifact.reviewer) errors.push(issue(artifact.id, "reviewer", "正式公开记录缺少审核人"));
      if (!artifact.reviewedAt) errors.push(issue(artifact.id, "reviewedAt", "正式公开记录缺少审核日期"));
      const referenceMap = new Map((artifact.fieldReferences ?? []).map((reference) => [reference.field, reference]));
      const requiredFields = ["period", "dateDescription", "discoveryDate", "material", "artifactType", "discoveryLocation", "currentCollection", "dimensions", "summary", "detailedDescription", "researchNote"];
      for (const field of requiredFields) {
        if (!artifact[field]) continue;
        const reference = referenceMap.get(field);
        if (!reference) { errors.push(issue(artifact.id, `fieldReferences.${field}`, `字段 ${field} 缺少字段级引用`)); continue; }
        const hasLocator = Boolean(reference.locator?.trim()) || reference.sourceIds.some((sourceId) => sourceMap.get(sourceId)?.href);
        if (!hasLocator) errors.push(issue(artifact.id, `fieldReferences.${field}`, `字段 ${field} 缺少页码、章节或链接`));
      }
      for (const item of artifact.timeline ?? []) if (!referenceMap.has(`timeline.${item.id}.text`)) errors.push(issue(artifact.id, `timeline.${item.id}`, "时间线内容缺少字段级引用"));
      for (const item of artifact.questions ?? []) if (!referenceMap.has(`questions.${item.id}.answer`)) errors.push(issue(artifact.id, `questions.${item.id}`, "问答答案缺少字段级引用"));
      if (artifact.model?.glbPath) {
        if (artifact.model.scale === undefined) errors.push(issue(artifact.id, "model.scale", "正式 GLB 缺少比例 scale"));
        if (!artifact.model.unit) errors.push(issue(artifact.id, "model.unit", "正式 GLB 缺少单位 unit"));
        if (!artifact.model.rotation) errors.push(issue(artifact.id, "model.rotation", "正式 GLB 缺少朝向 rotation"));
        if (!artifact.model.fallbackImageId) errors.push(issue(artifact.id, "model.fallbackImageId", "正式 GLB 缺少备用图片 ID"));
        if (!artifact.model.sourceId) errors.push(issue(artifact.id, "model.sourceId", "正式 GLB 缺少来源 ID"));
      }
    }

    for (const image of artifact.images ?? []) {
      if (image.sourceId && !sourceMap.has(image.sourceId)) errors.push(issue(artifact.id, `images.${image.id}.sourceId`, `图片来源 ${image.sourceId} 不存在`));
      await validateAsset(artifact, `images.${image.id}.src`, image.src, "image", image.authorizationStatus);
    }
    if (artifact.model?.sourceId && !sourceMap.has(artifact.model.sourceId)) errors.push(issue(artifact.id, "model.sourceId", `模型来源 ${artifact.model.sourceId} 不存在`));
    if (artifact.model?.glbPath) await validateAsset(artifact, "model.glbPath", artifact.model.glbPath, "model", artifact.model.authorizationStatus);
    for (const audio of artifact.audio ?? []) {
      if (audio.sourceId && !sourceMap.has(audio.sourceId)) errors.push(issue(artifact.id, `audio.${audio.id}.sourceId`, `音频来源 ${audio.sourceId} 不存在`));
      if (audio.filePath) await validateAsset(artifact, `audio.${audio.id}.filePath`, audio.filePath, "audio", audio.authorizationStatus);
    }

    if (artifact.catalogVisibility === "internal" && artifact.reviewStatus === "draft") {
      const accidentalFiles = await listFiles(path.join(root, "public", "artifacts", artifact.slug));
      if (accidentalFiles.length) errors.push(issue(artifact.id, "public", "内部草稿的素材被放入公开目录，请移回私有项目资料目录"));
    }
  }

  const publicArtifactFiles = await listFiles(path.join(root, "public", "artifacts"));
  for (const file of publicArtifactFiles) if (!referencedPublicFiles.has(path.normalize(file))) warnings.push(issue("公开素材", path.relative(path.join(root, "public"), file), "文件未被任何文物记录引用", "warning"));
  return { errors, warnings };
}

export function formatArtifactCheckReport({ errors, warnings }) {
  if (!errors.length && !warnings.length) return "文物资料预检通过：未发现问题。";
  const grouped = new Map();
  for (const item of [...errors, ...warnings]) {
    if (!grouped.has(item.artifactId)) grouped.set(item.artifactId, []);
    grouped.get(item.artifactId).push(item);
  }
  const lines = [errors.length ? `预检失败：${errors.length} 个错误，${warnings.length} 个警告。` : `预检通过：0 个错误，${warnings.length} 个警告。`];
  for (const [artifactId, items] of grouped) {
    lines.push(`\n[${artifactId}]`);
    for (const item of items) lines.push(`- ${item.severity === "error" ? "错误" : "警告"} ${item.field}：${item.message}`);
  }
  return lines.join("\n");
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { artifacts, validateArtifactCatalog } = await import("../app/heritage-data.ts");
  const result = await checkArtifactToolkit({ root, artifacts, catalogIssues: validateArtifactCatalog(artifacts) });
  console.log(formatArtifactCheckReport(result));
  if (result.errors.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
