import type { Metadata } from "next";
import Link from "next/link";
import ArtifactOverview from "../components/ArtifactOverview";
import { getCatalogArtifacts } from "../heritage-data";

export const metadata: Metadata = {
  title: "文物总览",
  description: "河南音乐考古数字展示平台：浏览全部可展示文物并使用搜索与分类筛选。",
};

export default function ArtifactsPage() {
  const artifacts = getCatalogArtifacts();

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="返回项目首页">
          <span className="brand-seal">豫</span>
          <span><strong>豫音焕新声</strong><small>河南音乐考古数字展示</small></span>
        </Link>
        <nav aria-label="主要导航">
          <Link href="/">项目首页</Link>
        </nav>
      </header>

      <section className="catalog-page-hero" aria-labelledby="catalog-page-title">
        <div className="section catalog-page-hero-inner">
          <Link className="artifact-route-back" href="/">← 返回首页</Link>
          <p className="hero-kicker">COLLECTION · CATALOG</p>
          <h1 id="catalog-page-title">文物总览</h1>
          <p>浏览已公开、演示或正在整理的文物，使用名称搜索与分类筛选。</p>
        </div>
      </section>

      <ArtifactOverview artifacts={artifacts} />
    </main>
  );
}
