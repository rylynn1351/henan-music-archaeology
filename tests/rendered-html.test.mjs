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
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps sources, warnings, and assets explicit", async () => {
  const [data, page, packageJson] = await Promise.all([
    readFile(new URL("../app/heritage-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/HeritageDemo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    access(new URL("public/jiahu-bone-flute.jpg", root)),
  ]);

  assert.match(data, /河南博物院/);
  assert.match(data, /doi\.org\/10\.1038\/43865/);
  assert.match(page, /非文物扫描/);
  assert.match(page, /不是贾湖骨笛原件或复原件录音/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
