import Link from "next/link";
import ArtifactOverview from "./components/ArtifactOverview";
import {
  featuredArtifact,
  getCatalogArtifacts,
} from "./heritage-data";

export default function HeritageDemo() {
  const catalogArtifacts = getCatalogArtifacts();
  const highlights = featuredArtifact.highlights ?? [];
  const featuredDetailHref = `/artifacts/${encodeURIComponent(featuredArtifact.slug)}`;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回页面顶部">
          <span className="brand-seal">豫</span>
          <span><strong>豫音焕新声</strong><small>河南音乐考古数字展示</small></span>
        </a>
        <nav aria-label="主要导航">
          <a href="#top">项目首页</a>
          <a href="#artifacts">文物总览</a>
        </nav>
        <a className="header-action" href="#artifacts">浏览文物</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="project-badge"><span /> 2026 大学生创新训练计划 · 项目概念验证</div>
          <p className="hero-kicker">A DIGITAL ECHO OF ANCIENT HENAN</p>
          <h1>一管骨笛<br /><em>九千年回响</em></h1>
          <p className="hero-lead">
            从贾湖出土的一件音乐文物出发，用数字叙事、3D 交互与可信讲解，
            让河南音乐考古资源被更多人看见、听见、理解。
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#artifacts">开始探索 <span>→</span></a>
            <Link className="button ghost" href={featuredDetailHref}>查看重点文物</Link>
          </div>
          <p className="concept-disclaimer">当前为概念验证Demo，非最终研究成果</p>
          <div className="hero-stats">
            {highlights.map((highlight) => (
              <div key={`${highlight.value}-${highlight.label}`}>
                <strong>{highlight.value}</strong><span>{highlight.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="scroll-cue"><span /> 向下探索</div>
      </section>

      <ArtifactOverview artifacts={catalogArtifacts} />

      <footer>
        <div className="brand footer-brand">
          <span className="brand-seal">豫</span>
          <span><strong>豫音焕新声</strong><small>让河南音乐文物重新发声</small></span>
        </div>
        <p>郑州大学 2026 大学生创新训练计划 · v0.3 演示版本</p>
        <span>当前为概念验证Demo，非最终研究成果 · 内容待音乐学、考古学成员持续审校</span>
      </footer>
    </main>
  );
}
