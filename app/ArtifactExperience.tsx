"use client";

import { lazy, Suspense } from "react";
import Link from "next/link";
import ArtifactDetail from "./ArtifactDetail";
import ArtifactAudioPlayer, { AudioPlayerFallback } from "./components/ArtifactAudioPlayer";
import ArtifactGuide, { GuideFallback } from "./components/ArtifactGuide";
import { ModelViewerFallback } from "./components/ArtifactModelViewer";
import ModuleErrorBoundary from "./components/ModuleErrorBoundary";
import { getPrimaryImage, getSourcesForArtifact, type Artifact } from "./heritage-data";

const ArtifactModelViewer = lazy(() => import("./components/ArtifactModelViewer"));

export default function ArtifactExperience({ artifact }: { artifact: Artifact }) {
  const sources = getSourcesForArtifact(artifact);
  const timeline = artifact.timeline ?? [];
  const questions = artifact.questions ?? [];
  const tracks = artifact.audio ?? [];
  const model = artifact.model;
  const primaryImage = getPrimaryImage(artifact);
  const modelFallbackImage = artifact.images?.find((image) => image.id === model?.fallbackImageId) ?? primaryImage;

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="返回项目首页"><span className="brand-seal">豫</span><span><strong>豫音焕新声</strong><small>河南音乐考古数字展示</small></span></Link>
        <nav aria-label="主要导航"><Link href="/#artifacts">文物总览</Link><a href="#artifact">文物档案</a><a href="#timeline">历史回响</a><a href="#experience">数字体验</a><a href="#guide">智能讲解</a></nav>
        <a className="header-action" href="#experience">进入展厅</a>
      </header>

      <section className="artifact-route-hero" id="top" aria-labelledby="artifact-route-title"><div className="section artifact-route-hero-inner"><Link className="artifact-route-back" href="/#artifacts">← 返回文物总览</Link><p className="hero-kicker">HENAN MUSIC ARCHAEOLOGY</p><h1 id="artifact-route-title">{artifact.name}</h1>{artifact.subtitle ? <p>{artifact.subtitle}</p> : null}<p className="concept-disclaimer">当前为概念验证Demo，非最终研究成果</p></div></section>

      <ArtifactDetail artifact={artifact} sources={sources} />

      <section className="timeline-section" id="timeline"><div className="section timeline-inner">
        <div className="section-heading split-heading light-heading"><div><span className="eyebrow light">02 · 历史回响</span><h2>从远古，到今天</h2></div><p>让文物回到考古层位、研究过程与公共传播的时间脉络中。</p></div>
        {timeline.length > 0 ? <div className="timeline">{timeline.map((item, index) => <article key={`${item.year}-${item.title}`} className="timeline-item"><span className="timeline-number">{String(index + 1).padStart(2, "0")}</span><time>{item.year}</time><h3>{item.title}</h3><p>{item.text}</p></article>)}</div> : <div className="module-empty-state module-empty-dark" role="status"><strong>时间线资料待补充</strong><p>团队提供并审核时间线资料后将在此展示。</p></div>}
      </div></section>

      <section className="section experience-section" id="experience">
        <div className="section-heading split-heading"><div><span className="eyebrow">03 · 数字体验</span><h2>看见形制，听见想象</h2></div><p>统一查看器支持程序化演示和经授权 GLB；统一播放器支持合成演示与正式音频文件。</p></div>
        <div className="experience-grid">
          <div className="viewer-column">
            <div className="card-label"><span>3D</span><div><strong>{artifact.name} · 交互模型</strong><small>GENERAL MODEL VIEWER</small></div></div>
            {model ? <ModuleErrorBoundary key={`model-${artifact.id}`} fallback={<ModelViewerFallback fallbackImage={modelFallbackImage} message="3D模块发生异常，其他内容仍可继续使用。" />}><Suspense fallback={<div className="viewer-shell viewer-loading" role="status">正在准备3D查看器…</div>}><ArtifactModelViewer model={model} fallbackImage={modelFallbackImage} /></Suspense></ModuleErrorBoundary> : <ModelViewerFallback fallbackImage={primaryImage} message="当前文物尚未提供可展示的3D资料。" />}
            {model?.notice ? <p className="demo-warning">{model.notice}</p> : null}
          </div>
          <div className="feature-column"><article><span>01</span><div><h3>旋转观察</h3><p>从不同角度查看文物形制。</p></div></article><article><span>02</span><div><h3>细节缩放</h3><p>通过鼠标滚轮或触屏手势控制观察距离。</p></div></article><article><span>03</span><div><h3>安全降级</h3><p>模型不可用时保留备用图片和文字资料。</p></div></article><div className="next-model"><span>资料接入</span><strong>替换为团队提供的授权 GLB</strong><p>填写路径、比例、单位、朝向、来源和授权信息即可接入。</p></div></div>
        </div>
        {tracks.length > 0 ? <ModuleErrorBoundary key={`audio-${artifact.id}`} fallback={<AudioPlayerFallback audio={tracks[0]} message="音频模块发生异常，其他内容仍可继续使用。" />}><ArtifactAudioPlayer tracks={tracks} /></ModuleErrorBoundary> : <AudioPlayerFallback message="当前文物尚未提供可用的声音资料。" />}
      </section>

      <section className="guide-section" id="guide"><div className="section guide-inner"><div className="guide-copy"><span className="eyebrow light">04 · 智能讲解</span><h2>每一个答案，<br />都应该有出处。</h2><p>当前使用 {questions.length} 组经录入的本地问答验证交互，不伪装成已经完成的联网 AI。</p><ul><li><span>✓</span> 本地运行，不上传提问</li><li><span>✓</span> 无法匹配时明确说明资料不足</li><li><span>✓</span> 后续只接入经专家审校的资料库</li></ul></div><ModuleErrorBoundary key={`guide-${artifact.id}`} fallback={<GuideFallback message="问答模块发生异常，请继续浏览固定文物资料。" />}><ArtifactGuide questions={questions} /></ModuleErrorBoundary></div></section>

      <section className="section source-section"><div className="section-heading split-heading"><div><span className="eyebrow">05 · 来源与开源基础</span><h2>可核验，才能继续生长</h2></div><p>内容与素材分开记录来源，未经审核和授权的资料不进入正式展示。</p></div>
        {sources.length > 0 ? <div className="source-grid">{sources.map((source, index) => <a href={source.href} target="_blank" rel="noreferrer" key={source.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{source.name}</strong><small>{source.note}</small></div><b>↗</b></a>)}</div> : <div className="module-empty-state source-empty-state" role="status"><strong>资料来源待团队提供</strong><p>来源完成核对后将在此列出。</p></div>}
        <div className="opensource-note"><span>OPEN SOURCE FOUNDATION</span><p><a href="https://github.com/jungang/alumnet" target="_blank" rel="noreferrer">AlumNet / MIT</a> 提供产品参考；<a href="https://github.com/mrdoob/three.js" target="_blank" rel="noreferrer">Three.js / MIT</a> 提供 3D 渲染基础。</p></div>
      </section>

      <footer><div className="brand footer-brand"><span className="brand-seal">豫</span><span><strong>豫音焕新声</strong><small>让河南音乐文物重新发声</small></span></div><p>郑州大学 2026 大学生创新训练计划 · v0.4 多文物框架</p><span>当前为概念验证Demo，非最终研究成果 · 内容待专业成员持续审校</span></footer>
    </main>
  );
}
