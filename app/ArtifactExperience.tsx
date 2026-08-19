"use client";

import { lazy, Suspense, useRef, useState } from "react";
import Link from "next/link";
import ArtifactDetail from "./ArtifactDetail";
import ArtifactAudioPlayer, { AudioPlayerFallback } from "./components/ArtifactAudioPlayer";
import ArtifactCommemorativeCard, { MemorialCardFallback } from "./components/ArtifactCommemorativeCard";
import ArtifactGuide, { GuideFallback } from "./components/ArtifactGuide";
import HeritageHero from "./components/HeritageHero";
import SiteFooter from "./components/SiteFooter";
import ArtifactTimeline from "./components/ArtifactTimeline";
import { ModelViewerFallback } from "./components/ArtifactModelViewer";
import ModuleErrorBoundary from "./components/ModuleErrorBoundary";
import {
  buildHotspotAudioHint,
  resolveHotspotClickOutcome,
  type ArtifactAudioPlayerHandle,
} from "./hotspot-audio-link";
import { getPrimaryImage, getSourcesForArtifact, type Artifact, type ArtifactModelHotspot } from "./heritage-data";
import { getArtifactHeroHighlights } from "./hero-utils";

const ArtifactModelViewer = lazy(() => import("./components/ArtifactModelViewer"));

export default function ArtifactExperience({ artifact }: { artifact: Artifact }) {
  const sources = getSourcesForArtifact(artifact);
  const questions = artifact.questions ?? [];
  const tracks = artifact.audio ?? [];
  const model = artifact.model;
  const primaryImage = getPrimaryImage(artifact);
  const heroHighlights = getArtifactHeroHighlights(artifact);
  const modelFallbackImage = artifact.images?.find((image) => image.id === model?.fallbackImageId) ?? primaryImage;
  const [selectedTrackId, setSelectedTrackId] = useState(tracks[0]?.id ?? "");
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | undefined>();
  const [hotspotAudioHint, setHotspotAudioHint] = useState<string>();
  const playerRef = useRef<ArtifactAudioPlayerHandle>(null);

  const handleSelectHotspot = (hotspot: ArtifactModelHotspot | null) => {
    if (!hotspot) { setSelectedHotspotId(undefined); setHotspotAudioHint(undefined); return; }
    setSelectedHotspotId(hotspot.id);
    setHotspotAudioHint(buildHotspotAudioHint(resolveHotspotClickOutcome(hotspot, tracks, selectedTrackId, playerRef.current)));
  };

  return (
    <main className="artifact-experience-page">
      <header className="site-header artifact-site-header">
        <Link className="brand" href="/" aria-label="返回项目首页"><span className="brand-seal">豫</span><span><strong>豫音焕新声</strong><small>河南音乐考古数字展示</small></span></Link>
        <nav aria-label="主要导航"><Link href="/artifacts">文物总览</Link><a href="#artifact">文物档案</a><a href="#timeline">历史回响</a><a href="#experience">数字体验</a><a href="#guide">智能讲解</a></nav>
        <a className="header-action" href="#experience">进入展厅</a>
      </header>

      <HeritageHero
        variant="artifact"
        badge={[artifact.displayIndex ? `NO. ${artifact.displayIndex}` : undefined, artifact.period].filter(Boolean).join(" · ") || "数字文物档案"}
        kicker="HENAN MUSIC ARCHAEOLOGY"
        title={artifact.name}
        accentTitle={artifact.subtitle}
        description={artifact.summary ?? "相关文物资料正在持续整理。"}
        image={primaryImage}
        imageFallbackText={`${artifact.name}主视觉待补充`}
        actions={[
          { href: "#artifact", label: "查看文物档案", primary: true },
          { href: "#experience", label: "进入数字体验" },
        ]}
        highlights={heroHighlights}
        backHref="/artifacts"
        backLabel="← 返回文物总览"
        scrollLabel="向下查看"
      />

      <ArtifactDetail artifact={artifact} sources={sources} />

      <ArtifactTimeline
        items={artifact.timeline ?? []}
        breakAfter={artifact.timelineBreakAfter}
        breakLabel={artifact.timelineBreakLabel}
      />

      <section className="section experience-section" id="experience">
        <div className="section-heading stacked-heading"><span className="eyebrow">03 · 数字体验</span><h2 className="semantic-heading"><span>看见形制，</span><span>听见想象</span></h2><p>结合图像、交互模型与声音资料，从不同感官路径理解文物的形制与文化信息。</p></div>
        <div className="experience-grid">
          <div className="viewer-column">
            <div className="card-label"><span>3D</span><div><strong>{artifact.name} · 交互模型</strong><small>GENERAL MODEL VIEWER</small></div></div>
            {model ? <ModuleErrorBoundary key={`model-${artifact.id}`} fallback={<ModelViewerFallback fallbackImage={modelFallbackImage} message="3D模块发生异常，其他内容仍可继续使用。" />}><Suspense fallback={<div className="viewer-shell viewer-loading" role="status">正在准备3D查看器…</div>}><ArtifactModelViewer model={model} fallbackImage={modelFallbackImage} selectedHotspotId={selectedHotspotId} onSelectHotspot={handleSelectHotspot} audioStatusHint={hotspotAudioHint} /></Suspense></ModuleErrorBoundary> : <ModelViewerFallback fallbackImage={primaryImage} message="当前文物尚未提供可展示的3D资料。" />}
            {model?.notice ? <p className="demo-warning">{model.notice}</p> : null}
          </div>
          <div className="feature-column"><article><span>01</span><div><h3>旋转观察</h3><p>从不同角度查看文物形制。</p></div></article><article><span>02</span><div><h3>细节缩放</h3><p>通过鼠标滚轮或触屏手势控制观察距离。</p></div></article><article><span>03</span><div><h3>重点标注</h3><p>结合交互热点理解文物的结构与细节。</p></div></article><div className="next-model"><span>数字化观察</span><strong>跨越展柜，靠近文物细节</strong><p>在不接触原件的前提下，从更多角度理解文物形制与相关信息。</p></div></div>
        </div>
        {tracks.length > 0 ? <ModuleErrorBoundary key={`audio-${artifact.id}`} fallback={<AudioPlayerFallback audio={tracks[0]} message="音频模块发生异常，其他内容仍可继续使用。" />}><ArtifactAudioPlayer tracks={tracks} selectedTrackId={selectedTrackId} onSelectTrack={setSelectedTrackId} playerRef={playerRef} /></ModuleErrorBoundary> : <AudioPlayerFallback message="当前文物尚未提供可用的声音资料。" />}
      </section>

      <section className="guide-section" id="guide"><div className="section guide-inner"><div className="guide-copy"><span className="eyebrow light">04 · 智能讲解</span><h2>循着资料，<br />读懂文物。</h2><p>数字讲解员围绕当前文物档案和已收录资料，提供常见问题解答与重点信息索引。</p><ul><li><span>✓</span> 围绕当前文物内容回答</li><li><span>✓</span> 推荐问题快速导览</li><li><span>✓</span> 未收录问题明确提示范围</li></ul></div><ModuleErrorBoundary key={`guide-${artifact.id}`} fallback={<GuideFallback message="讲解服务暂时不可用，请继续浏览文物档案。" />}><ArtifactGuide questions={questions} /></ModuleErrorBoundary></div></section>

      <section className="section source-section"><div className="section-heading stacked-heading"><span className="eyebrow">05 · 资料来源</span><h2>可核验，才能继续生长</h2><p>内容与素材分开记录来源，未经审核和授权的资料不进入正式展示。</p></div>
        {sources.length > 0 ? <div className="source-grid">{sources.map((source, index) => <a href={source.href} target="_blank" rel="noreferrer" key={source.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{source.name}</strong><small>{source.note}</small></div><b>↗</b></a>)}</div> : <div className="module-empty-state source-empty-state" role="status"><strong>暂无可公开的资料来源</strong><p>来源完成核对后将在此列出。</p></div>}
      </section>

      <ModuleErrorBoundary key={`memorial-${artifact.id}`} fallback={<MemorialCardFallback />}>
        <ArtifactCommemorativeCard artifact={artifact} />
      </ModuleErrorBoundary>

      <SiteFooter />
    </main>
  );
}
