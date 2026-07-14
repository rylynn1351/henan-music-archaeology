import type { Artifact, ArtifactSource } from "./heritage-data";

type ArtifactDetailProps = {
  artifact: Artifact;
  sources: ArtifactSource[];
};

export default function ArtifactDetail({ artifact, sources }: ArtifactDetailProps) {
  return (
    <section className="section artifact-section" id="artifact">
      <div className="section-heading split-heading">
        <div><span className="eyebrow">01 · 文物档案</span><h2>{artifact.name}</h2></div>
        <p>{artifact.summary}</p>
      </div>
      <div className="artifact-grid">
        <figure className="artifact-photo">
          <img src={artifact.assets.image.src} alt={artifact.assets.image.alt} />
          <figcaption>
            <span>{artifact.assets.image.label}</span>
            {artifact.assets.image.caption}<br />
            {artifact.assets.image.credit}
          </figcaption>
        </figure>
        <div className="artifact-details">
          <span className="big-index">NO. {artifact.displayIndex}</span>
          <h3>{artifact.subtitle}</h3>
          <dl>
            {artifact.facts.map((fact) => (
              <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
            ))}
          </dl>
          <aside className="artifact-provenance" aria-label="文物资料审核信息">
            <div>
              <span>内容审核状态</span>
              <strong data-review-status={artifact.contentReview.status}>{artifact.contentReview.label}</strong>
            </div>
            <div>
              <span>资料来源</span>
              <p>
                {sources.map((source, index) => (
                  <span key={source.id}>
                    {index > 0 ? "、" : ""}
                    <a href={source.href} target="_blank" rel="noreferrer">{source.name}</a>
                  </span>
                ))}
              </p>
            </div>
            <div>
              <span>最后更新时间</span>
              <time dateTime={artifact.contentReview.lastUpdated}>{artifact.contentReview.lastUpdated}</time>
            </div>
          </aside>
          <div className="research-note"><strong>研究提示</strong><p>{artifact.researchNote}</p></div>
        </div>
      </div>
    </section>
  );
}
