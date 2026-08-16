import Link from "next/link";
import ArtifactImage from "./ArtifactImage";
import {
  getPrimaryImage,
  getReviewStatusLabel,
  type Artifact,
} from "../heritage-data";

type ArtifactCardProps = {
  artifact: Artifact;
};

export default function ArtifactCard({ artifact }: ArtifactCardProps) {
  const primaryImage = getPrimaryImage(artifact);
  const detailHref = `/artifacts/${encodeURIComponent(artifact.slug)}`;
  const metadata = [
    { label: "时期", value: artifact.period },
    { label: "材质", value: artifact.material },
    { label: "类型", value: artifact.artifactType },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <article className="artifact-card" data-artifact-card={artifact.slug}>
      <div className="artifact-card-media">
        <ArtifactImage
          image={primaryImage}
          sizes="(max-width: 720px) calc(100vw - 36px), 380px"
          fallbackText={`${artifact.name}图片资料待补充`}
          fallbackClassName="artifact-card-image-fallback"
        />
        <div className="artifact-card-badges">
          <span>{getReviewStatusLabel(artifact.reviewStatus)}</span>
          {artifact.isDemo ? <span className="demo">Demo</span> : null}
        </div>
      </div>

      <div className="artifact-card-body">
        <div>
          <p className="artifact-card-kicker">HENAN MUSIC ARCHAEOLOGY</p>
          <h3>{artifact.name}</h3>
          {artifact.subtitle ? <p className="artifact-card-subtitle">{artifact.subtitle}</p> : null}
        </div>

        {metadata.length > 0 ? (
          <dl className="artifact-card-metadata">
            {metadata.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <p className="artifact-card-summary">
          {artifact.isPlaceholder ? "资料整理中，完成专业审核后将在此更新。" : artifact.summary ?? "资料待补充"}
        </p>

        <Link
          className="artifact-card-action"
          href={detailHref}
          aria-label={artifact.isPlaceholder ? `查看${artifact.name}资料整理状态` : `查看${artifact.name}详情`}
        >
          {artifact.isPlaceholder ? "查看整理进度" : "查看详情"} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
