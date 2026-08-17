"use client";

import Link from "next/link";

type ArtifactRouteErrorProps = {
  reset: () => void;
};

export default function ArtifactRouteError({ reset }: ArtifactRouteErrorProps) {
  return (
    <main className="artifact-route-state">
      <section aria-labelledby="artifact-route-error-title">
        <span className="eyebrow">文物详情 · ERROR</span>
        <h1 id="artifact-route-error-title">文物资料暂时无法读取</h1>
        <p>请稍后重试，或返回文物总览继续浏览。</p>
        <div className="artifact-route-state-actions">
          <button className="button primary" type="button" onClick={reset}>
            重新尝试
          </button>
          <Link className="button route-secondary" href="/artifacts">
            返回文物总览
          </Link>
        </div>
      </section>
    </main>
  );
}
