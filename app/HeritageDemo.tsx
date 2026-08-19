import Link from "next/link";
import ArtifactCard from "./components/ArtifactCard";
import HeritageHero from "./components/HeritageHero";
import SiteFooter from "./components/SiteFooter";
import { getCatalogArtifacts, type ArtifactHighlight } from "./heritage-data";

const projectHighlights: ArtifactHighlight[] = [
  { value: "文物档案", label: "· 持续建设" },
  { value: "数字体验", label: "· 多模态展示" },
  { value: "资料来源", label: "· 可核验" },
];

export default function HeritageDemo() {
  const catalogArtifacts = getCatalogArtifacts();

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回页面顶部">
          <span className="brand-seal">豫</span>
          <span><strong>豫音焕新声</strong><small>河南音乐考古数字展示</small></span>
        </a>
        <nav aria-label="主要导航">
          <a href="#top">项目首页</a>
          <Link href="/artifacts">文物总览</Link>
        </nav>
        <Link className="header-action" href="/artifacts">浏览文物</Link>
      </header>

      <HeritageHero
        variant="project"
        kicker="DIGITAL MUSIC ARCHAEOLOGY OF HENAN"
        title="豫音焕新声"
        accentTitle="让河南音乐文物重新发声"
        description="以数字档案、交互体验与可核验资料为基础，让河南音乐考古资源被更多人看见、听见、理解。"
        actions={[
          { href: "/artifacts", label: "浏览文物", primary: true },
          { href: "#artifacts", label: "了解项目" },
        ]}
        highlights={projectHighlights}
      />

      <section className="section home-preview-section" id="artifacts" aria-labelledby="home-preview-title">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">文物精选 · COLLECTION</span>
            <h2 id="home-preview-title" className="semantic-heading">
              <span>从一件文物，</span>
              <span>建立可扩展的数字档案</span>
            </h2>
          </div>
          <Link className="button route-secondary" href="/artifacts">查看全部文物 <span aria-hidden="true">→</span></Link>
        </div>
        <div className="artifact-card-grid">
          {catalogArtifacts.slice(0, 3).map((artifact) => <ArtifactCard artifact={artifact} key={artifact.id} />)}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
