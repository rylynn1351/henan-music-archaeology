import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArtifactExperience from "../../ArtifactExperience";
import ArtifactComingSoon from "../../components/ArtifactComingSoon";
import {
  getCatalogArtifactBySlug,
  getCatalogArtifacts,
  getDisplayableArtifactBySlug,
  isPlaceholderArtifact,
} from "../../heritage-data";

type ArtifactPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getCatalogArtifacts().map((artifact) => ({
    slug: artifact.slug,
  }));
}

export async function generateMetadata({
  params,
}: ArtifactPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artifact = getCatalogArtifactBySlug(slug);

  if (!artifact) {
    return {
      title: "未找到文物",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  if (isPlaceholderArtifact(artifact)) {
    return {
      title: `${artifact.name}｜资料整理中`,
      description: artifact.summary,
      robots: { index: false, follow: false },
    };
  }

  const description =
    artifact.summary ??
    `${artifact.name}数字展示页面，包含文物资料、交互演示与资料来源。`;

  return {
    title: `${artifact.name}数字展示`,
    description,
    openGraph: {
      type: "article",
      locale: "zh_CN",
      siteName: "豫音焕新声",
      title: `${artifact.name}数字展示｜豫音焕新声`,
      description,
    },
  };
}

export default async function ArtifactPage({ params }: ArtifactPageProps) {
  const { slug } = await params;
  const catalogArtifact = getCatalogArtifactBySlug(slug);

  if (!catalogArtifact) {
    notFound();
  }

  if (isPlaceholderArtifact(catalogArtifact)) {
    return <ArtifactComingSoon artifact={catalogArtifact} />;
  }

  const artifact = getDisplayableArtifactBySlug(slug);
  if (!artifact) notFound();

  return <ArtifactExperience artifact={artifact} />;
}
