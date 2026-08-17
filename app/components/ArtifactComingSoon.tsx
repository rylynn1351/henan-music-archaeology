import Link from "next/link";
import type { Artifact } from "../heritage-data";

export default function ArtifactComingSoon({ artifact }: { artifact: Artifact }) {
  return (
    <main className="coming-soon-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="返回项目首页">
          <span className="brand-seal">豫</span>
          <span><strong>豫音焕新声</strong><small>河南音乐考古数字展示</small></span>
        </Link>
        <nav aria-label="主要导航"><Link href="/artifacts">文物总览</Link></nav>
      </header>
      <section className="coming-soon-hero" aria-labelledby="coming-soon-title">
        <div className="section coming-soon-hero-inner">
          <div className="coming-soon-index">{artifact.displayIndex ?? "—"}</div>
          <p className="hero-kicker">COLLECTION IN PREPARATION</p>
          <h1 id="coming-soon-title">{artifact.name}</h1>
          <strong>资料整理中</strong>
          <p>{artifact.summary ?? "相关资料正在由团队整理与审核，完成后将在此更新。"}</p>
          <p className="coming-soon-note">本页不会自动补充或推断年代、材质、用途、声音及研究结论。</p>
          <Link className="button primary" href="/artifacts">← 返回文物总览</Link>
        </div>
      </section>
    </main>
  );
}
