import { notFound } from "next/navigation";
import ArtifactExperience from "../../ArtifactExperience";
import { getDisplayableArtifactBySlug } from "../../heritage-data";

type ArtifactPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ArtifactPage({ params }: ArtifactPageProps) {
  const { slug } = await params;
  const artifact = getDisplayableArtifactBySlug(slug);

  if (!artifact) {
    notFound();
  }

  return <ArtifactExperience artifact={artifact} />;
}
