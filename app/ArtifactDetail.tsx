import ArtifactImage from "./components/ArtifactImage";
import {
  getArtifactDisplayFacts,
  getContentClassificationLabel,
  getPrimaryImage,
  getReviewStatusLabel,
  type Artifact,
  type SourceReference,
} from "./heritage-data";

type ArtifactDetailProps = {
  artifact: Artifact;
  sources: SourceReference[];
};

export default function ArtifactDetail({ artifact, sources }: ArtifactDetailProps) {
  const primaryImage = getPrimaryImage(artifact);
  const facts = getArtifactDisplayFacts(artifact);
  const themeTitle = artifact.subtitle ?? artifact.name;
  const titleCommaIndex = themeTitle.indexOf("，");
  const themeTitleLines = titleCommaIndex >= 0
    ? [themeTitle.slice(0, titleCommaIndex + 1), themeTitle.slice(titleCommaIndex + 1)]
    : [themeTitle];

  return (
    <section className="section artifact-section" id="artifact">
      <div className="section-heading stacked-heading artifact-detail-heading">
        <span className="eyebrow">01 · 文物档案</span>
        <h2 className="semantic-heading">
          {themeTitleLines.map((line) => <span key={line}>{line}</span>)}
        </h2>
        {artifact.summary ? <p>{artifact.summary}</p> : null}
      </div>
      <div className="artifact-grid">
        <figure className="artifact-photo">
          <ArtifactImage
            image={primaryImage}
            sizes="(max-width: 760px) 100vw, 56vw"
            fallbackText={`${artifact.name}图片资料待补充`}
            fallbackClassName="artifact-photo-image-fallback"
          />
          {primaryImage && (primaryImage.label || primaryImage.caption || primaryImage.credit) ? (
            <figcaption>
              {primaryImage.label ? <span>{primaryImage.label}</span> : null}
              {primaryImage.caption}
              {primaryImage.caption && primaryImage.credit ? <br /> : null}
              {primaryImage.credit}
            </figcaption>
          ) : null}
        </figure>
        <div className="artifact-details">
          {artifact.displayIndex ? <span className="big-index">NO. {artifact.displayIndex}</span> : null}
          <h3 className="artifact-identity-name">{artifact.name}</h3>
          {facts.length > 0 ? (
            <dl>
              {facts.map((fact) => (
                <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
              ))}
            </dl>
          ) : null}
          <aside className="artifact-provenance" aria-label="文物资料审核信息">
            <div>
              <span>内容分类</span>
              <strong>{getContentClassificationLabel(artifact.contentClassification)}</strong>
            </div>
            <div>
              <span>内容审核状态</span>
              <strong data-review-status={artifact.reviewStatus}>
                {getReviewStatusLabel(artifact.reviewStatus)}
              </strong>
            </div>
            <div>
              <span>资料来源</span>
              <p>
                {sources.length > 0 ? sources.map((source, index) => (
                  <span key={source.id}>
                    {index > 0 ? "、" : ""}
                    {source.href ? (
                      <a href={source.href} target="_blank" rel="noreferrer">{source.name}</a>
                    ) : source.name}
                  </span>
                )) : "待团队提供"}
              </p>
            </div>
            <div>
              <span>最后更新时间</span>
              {artifact.updatedAt ? (
                <time dateTime={artifact.updatedAt}>{artifact.updatedAt}</time>
              ) : <span>待团队提供</span>}
            </div>
          </aside>
          {artifact.researchNote ? (
            <div className="research-note"><strong>研究提示</strong><p>{artifact.researchNote}</p></div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
