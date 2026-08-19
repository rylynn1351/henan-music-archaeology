import Link from "next/link";
import type { ArtifactHighlight, ArtifactImage as ArtifactImageData } from "../heritage-data";
import ArtifactImage from "./ArtifactImage";

type HeroAction = {
  href: string;
  label: string;
  primary?: boolean;
};

type HeritageHeroProps = {
  variant: "project" | "artifact";
  badge?: string;
  kicker: string;
  title: string;
  accentTitle?: string;
  description: string;
  image?: ArtifactImageData;
  imageFallbackText?: string;
  actions: HeroAction[];
  highlights?: ArtifactHighlight[];
  backHref?: string;
  backLabel?: string;
  scrollLabel?: string;
};

export default function HeritageHero({
  variant,
  badge,
  kicker,
  title,
  accentTitle,
  description,
  image,
  imageFallbackText = "主视觉待补充",
  actions,
  highlights = [],
  backHref,
  backLabel,
  scrollLabel = "向下探索",
}: HeritageHeroProps) {
  const visibleHighlights = highlights.slice(0, 3);

  return (
    <section
      className={`heritage-hero heritage-hero--${variant}`}
      id="top"
      aria-labelledby="heritage-hero-title"
      data-hero-variant={variant}
    >
      {variant === "artifact" ? (
        <div className="hero-image hero-image--artifact">
          <ArtifactImage
            image={image}
            sizes="100vw"
            fallbackText={imageFallbackText}
            fallbackClassName="hero-image-fallback"
            priority
          />
        </div>
      ) : (
        <div className="hero-image hero-image--abstract" aria-hidden="true" />
      )}
      <div className="hero-shade" aria-hidden="true" />
      {variant === "project" ? (
        <div className="project-hero-visual" aria-hidden="true">
          <svg viewBox="0 0 720 720" role="presentation">
            <g className="project-visual-orbits">
              <circle cx="360" cy="360" r="276" />
              <circle cx="360" cy="360" r="214" />
              <circle cx="360" cy="360" r="142" />
            </g>
            <g className="project-visual-layers">
              <path d="M72 210 C176 164 250 248 360 202 S552 168 650 218" />
              <path d="M72 254 C176 208 250 292 360 246 S552 212 650 262" />
              <path d="M72 298 C176 252 250 336 360 290 S552 256 650 306" />
            </g>
            <g className="project-visual-wave">
              <path d="M76 388 C142 388 142 326 208 326 S274 454 340 454 S406 286 472 286 S538 388 644 388" />
              <path d="M104 430 C176 430 176 382 248 382 S320 478 392 478 S464 346 536 346 S608 430 660 430" />
            </g>
            <g className="project-visual-axis">
              <line x1="360" y1="92" x2="360" y2="628" />
              <line x1="92" y1="360" x2="628" y2="360" />
            </g>
            <g className="project-visual-nodes">
              <circle cx="170" cy="258" r="7" /><circle cx="548" cy="244" r="7" />
              <circle cx="206" cy="506" r="7" /><circle cx="534" cy="494" r="7" />
            </g>
            <g className="project-visual-focus">
              <circle cx="360" cy="360" r="45" />
              <text x="360" y="373" textAnchor="middle">豫</text>
            </g>
            <g className="project-visual-labels">
              <text x="132" y="238">档案</text><text x="564" y="226">形制</text>
              <text x="164" y="540">声音</text><text x="550" y="526">来源</text>
            </g>
          </svg>
        </div>
      ) : null}
      <div className="hero-content">
        <div className="hero-copy">
          {backHref && backLabel ? (
            <Link className="hero-back-link" href={backHref}>{backLabel}</Link>
          ) : null}
          {badge ? <div className="project-badge"><span />{badge}</div> : null}
          <p className="hero-kicker">{kicker}</p>
          <h1 id="heritage-hero-title">
            <span>{title}</span>
            {accentTitle ? <em>{accentTitle}</em> : null}
          </h1>
          <p className="hero-lead">{description}</p>
          <div className="hero-actions">
            {actions.map((action) => (
              <Link
                className={`button ${action.primary ? "primary motion-cta hero-explore-action" : "ghost"}`}
                href={action.href}
                key={`${action.href}-${action.label}`}
              >
                {action.primary ? (
                  <><span className="motion-cta-label">{action.label}</span><span className="motion-cta-arrow" aria-hidden="true">→</span></>
                ) : action.label}
              </Link>
            ))}
          </div>
        </div>
        {visibleHighlights.length > 0 ? (
          <div className="hero-stats" aria-label={variant === "project" ? "项目特点" : "文物亮点"}>
            {visibleHighlights.map((highlight) => (
              <div key={`${highlight.value}-${highlight.label}`}>
                <strong>{highlight.value}</strong><span>{highlight.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="scroll-cue" aria-hidden="true"><span />{scrollLabel}</div>
    </section>
  );
}
