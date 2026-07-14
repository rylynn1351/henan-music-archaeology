import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
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
  assert.match(html, /豫音焕新声/);
  assert.match(html, /贾湖骨笛/);
  assert.match(html, /数字讲解员/);
  assert.match(html, /2026 大学生创新训练计划/);
  assert.match(html, /项目概念验证/);
  assert.match(html, /多种孔数/);
  assert.match(html, /形制丰富/);
  assert.match(html, /当前为概念验证Demo，非最终研究成果/);
  assert.match(html, /内容审核状态/);
  assert.match(html, /待专业成员审核/);
  assert.match(html, /资料来源/);
  assert.match(html, /最后更新时间/);
  assert.doesNotMatch(html, /国家级推荐|5—8<\/strong>/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps artifact data, sources, warnings, and assets explicit", async () => {
  const [data, page, detail, packageJson] = await Promise.all([
    readFile(new URL("../app/heritage-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/HeritageDemo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ArtifactDetail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    access(new URL("public/jiahu-bone-flute.jpg", root)),
  ]);

  assert.match(data, /export type Artifact =/);
  assert.match(data, /export const artifacts: Artifact\[\]/);
  assert.match(data, /contentReview/);
  assert.match(data, /sourceIds/);
  assert.match(data, /lastUpdated: "2026-07-14"/);
  assert.match(data, /河南博物院/);
  assert.match(data, /doi\.org\/10\.1038\/43865/);
  assert.match(detail, /artifact\.facts\.map/);
  assert.match(detail, /artifact\.contentReview/);
  assert.match(page, /OrbitControls/);
  assert.match(page, /createDemoWave/);
  assert.match(page, /function GuideChat/);
  assert.match(data, /非文物扫描/);
  assert.match(data, /不是贾湖骨笛原件或复原件录音/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
