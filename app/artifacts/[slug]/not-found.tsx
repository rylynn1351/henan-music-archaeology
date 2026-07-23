import Link from "next/link";

export default function ArtifactNotFound() {
  return (
    <main className="artifact-route-state">
      <section aria-labelledby="artifact-not-found-title">
        <span className="eyebrow">文物详情 · NOT FOUND</span>
        <h1 id="artifact-not-found-title">未找到可展示的文物</h1>
        <p>该文物可能不存在、仍是占位资料，或尚未达到允许展示的状态。</p>
        <Link className="button primary" href="/#artifacts">
          返回文物总览
        </Link>
      </section>
    </main>
  );
}
