"use client";

import Image from "next/image";
import { useState } from "react";
import type { ArtifactImage as ArtifactImageData } from "../heritage-data";

type ArtifactImageProps = {
  image?: ArtifactImageData;
  sizes: string;
  fallbackText: string;
  fallbackClassName: string;
};

export default function ArtifactImage({
  image,
  sizes,
  fallbackText,
  fallbackClassName,
}: ArtifactImageProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const hasFailed = Boolean(image && failedSrc === image.src);

  if (!image || hasFailed) {
    const accessibleLabel = image
      ? `${image.alt}（图片加载失败）`
      : fallbackText;

    return (
      <div
        className={fallbackClassName}
        role="img"
        aria-label={accessibleLabel}
        data-image-fallback={image ? "load-error" : "missing"}
      >
        <span>{hasFailed ? "图片暂时无法加载" : fallbackText}</span>
      </div>
    );
  }

  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={image.width ?? 4}
      height={image.height ?? 3}
      sizes={sizes}
      loading="lazy"
      unoptimized
      onError={() => setFailedSrc(image.src)}
    />
  );
}
