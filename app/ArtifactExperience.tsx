"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ArtifactDetail from "./ArtifactDetail";
import ArtifactImage from "./components/ArtifactImage";
import ModuleErrorBoundary from "./components/ModuleErrorBoundary";
import { getLocalGuideAnswer } from "./guide-utils";
import {
  getPrimaryAudio,
  getPrimaryImage,
  getSourcesForArtifact,
  type Artifact,
  type ArtifactAudio,
  type ArtifactImage as ArtifactImageData,
  type GuideQuestion,
} from "./heritage-data";

type Message = {
  role: "guide" | "visitor";
  text: string;
};

function ViewerFallback({
  fallbackImage,
  message,
}: {
  fallbackImage?: ArtifactImageData;
  message: string;
}) {
  return (
    <div
      className="viewer-shell viewer-fallback"
      role="status"
      data-module-fallback="3d"
    >
      <ArtifactImage
        image={fallbackImage}
        sizes="(max-width: 760px) 100vw, 58vw"
        fallbackText="3D与备用图片资料暂不可用"
        fallbackClassName="viewer-fallback-image"
      />
      <div className="viewer-fallback-copy">
        <strong>3D暂不可用</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

function BoneFluteViewer({
  ariaLabel,
  fallbackImage,
}: {
  ariaLabel: string;
  fallbackImage?: ArtifactImageData;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let scene: THREE.Scene | undefined;
    let camera: THREE.PerspectiveCamera | undefined;
    let renderer: THREE.WebGLRenderer | undefined;
    let controls: OrbitControls | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let visibilityObserver: IntersectionObserver | undefined;
    let removeResizeListener: (() => void) | undefined;
    let animationFrame = 0;
    let isVisible = false;
    let disposed = false;
    let failed = false;
    let resourcesReleased = false;

    const cleanupResources = () => {
      if (resourcesReleased) return;
      resourcesReleased = true;
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      removeResizeListener?.();
      controls?.dispose();
      if (controlsRef.current === controls) controlsRef.current = null;

      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        objectMaterials.forEach((material) => materials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());

      renderer?.dispose();
      if (renderer?.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };

    const showFailure = () => {
      if (disposed || failed) return;
      failed = true;
      cleanupResources();
      queueMicrotask(() => {
        if (!disposed) {
          setErrorMessage("当前设备无法初始化或继续渲染3D，请查看备用图片和文字资料。");
        }
      });
    };

    const animate = () => {
      if (!isVisible || disposed || failed) {
        animationFrame = 0;
        return;
      }
      try {
        controls?.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
        animationFrame = requestAnimationFrame(animate);
      } catch {
        showFailure();
      }
    };

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0.2, 9);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      mount.appendChild(renderer.domElement);

      const flute = new THREE.Group();
      flute.rotation.z = Math.PI / 2;
      flute.rotation.x = -0.12;
      scene.add(flute);

      const boneMaterial = new THREE.MeshStandardMaterial({
        color: 0xc8a778,
        roughness: 0.67,
        metalness: 0.02,
      });
      const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0x8f6841,
        roughness: 0.8,
      });
      const holeMaterial = new THREE.MeshStandardMaterial({
        color: 0x241a14,
        roughness: 1,
      });

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.34, 6.1, 64, 8),
        boneMaterial,
      );
      flute.add(body);

      [-3.02, 3.02].forEach((y, index) => {
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(index === 0 ? 0.34 : 0.25, 0.045, 16, 64),
          edgeMaterial,
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = y;
        flute.add(rim);
      });

      [-2.1, -1.45, -0.78, -0.08, 0.66, 1.44, 2.26].forEach((y, index) => {
        const hole = new THREE.Mesh(
          new THREE.CylinderGeometry(
            index < 2 ? 0.12 : 0.14,
            index < 2 ? 0.12 : 0.14,
            0.05,
            32,
          ),
          holeMaterial,
        );
        hole.rotation.x = Math.PI / 2;
        hole.position.set(0, y, index < 3 ? 0.29 : 0.265);
        flute.add(hole);
      });

      const keyLight = new THREE.DirectionalLight(0xffe3b0, 4.2);
      keyLight.position.set(3, 4, 6);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0x9ab7a5, 2.1);
      fillLight.position.set(-5, -2, 3);
      scene.add(fillLight);
      scene.add(new THREE.HemisphereLight(0xf5d7a6, 0x1a2421, 1.8));

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.065;
      controls.minDistance = 5;
      controls.maxDistance = 15;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.75;
      controlsRef.current = controls;

      let renderedWidth = 0;
      let renderedHeight = 0;
      const resize = () => {
        if (!renderer || !camera || failed || disposed) return;
        const width = Math.round(mount.clientWidth);
        const height = Math.round(mount.clientHeight);
        if (width === renderedWidth && height === renderedHeight) return;
        renderedWidth = width;
        renderedHeight = height;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
      };
      resize();

      if (typeof ResizeObserver === "function") {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
      } else {
        window.addEventListener("resize", resize);
        removeResizeListener = () => window.removeEventListener("resize", resize);
      }

      if (typeof IntersectionObserver === "function") {
        visibilityObserver = new IntersectionObserver(
          ([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible && animationFrame === 0) animate();
          },
          { rootMargin: "120px 0px" },
        );
        visibilityObserver.observe(mount);
      } else {
        isVisible = true;
        animate();
      }

      renderer.render(scene, camera);
    } catch {
      showFailure();
    }

    return () => {
      disposed = true;
      cleanupResources();
    };
  }, []);

  const resetView = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.reset();
  };

  if (errorMessage) {
    return <ViewerFallback fallbackImage={fallbackImage} message={errorMessage} />;
  }

  return (
    <div className="viewer-shell">
      <div ref={mountRef} className="viewer-canvas" aria-label={ariaLabel} />
      <div className="viewer-overlay">
        <span>拖动旋转 · 滚轮或双指缩放</span>
        <button type="button" onClick={resetView} aria-label="重置 3D 模型视角">
          重置视角
        </button>
      </div>
    </div>
  );
}

function createDemoWave(): Blob {
  const sampleRate = 22050;
  const duration = 11.2;
  const totalSamples = Math.floor(sampleRate * duration);
  const data = new Int16Array(totalSamples);
  const notes = [293.66, 329.63, 392, 440, 392, 329.63, 293.66, 246.94];
  const noteLength = duration / notes.length;

  for (let i = 0; i < totalSamples; i += 1) {
    const time = i / sampleRate;
    const noteIndex = Math.min(Math.floor(time / noteLength), notes.length - 1);
    const localTime = time - noteIndex * noteLength;
    const frequency = notes[noteIndex];
    const attack = Math.min(localTime / 0.08, 1);
    const release = Math.min((noteLength - localTime) / 0.22, 1);
    const envelope = Math.max(0, attack * release);
    const vibrato = 1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * time);
    const phase = 2 * Math.PI * frequency * vibrato * time;
    const breath = (Math.sin(2 * Math.PI * 8300 * time) + Math.sin(2 * Math.PI * 6100 * time)) * 0.018;
    const sample =
      envelope *
      (0.58 * Math.sin(phase) + 0.2 * Math.sin(phase * 2) + 0.08 * Math.sin(phase * 3) + breath);
    data[i] = Math.max(-1, Math.min(1, sample)) * 32767;
  }

  const buffer = new ArrayBuffer(44 + data.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + data.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, data.length * 2, true);
  data.forEach((sample, index) => view.setInt16(44 + index * 2, sample, true));
  return new Blob([view], { type: "audio/wav" });
}

function AudioFallback({
  audio,
  message,
}: {
  audio?: ArtifactAudio;
  message: string;
}) {
  return (
    <div
      className="audio-card audio-fallback"
      role="status"
      data-module-fallback="audio"
    >
      <div className="audio-visual" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="audio-copy">
        <span className="eyebrow light">声音体验</span>
        <h3>{audio?.name ?? "声音资料待补充"}</h3>
        {audio?.description ? <p>{audio.description}</p> : null}
        <p className="module-error-message">{message}</p>
      </div>
    </div>
  );
}

function AudioExperience({ audio }: { audio: ArtifactAudio }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cleanupRef = useRef<() => void>(() => undefined);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    let objectUrl: string | undefined;
    let released = false;
    let disposed = false;

    const release = () => {
      if (released) return;
      released = true;
      try {
        audioElement.pause();
        audioElement.removeAttribute("src");
        audioElement.load();
      } catch {
        // Resource cleanup must continue even when a browser media API fails.
      }
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // The URL is already unusable; no further recovery is needed here.
        }
        objectUrl = undefined;
      }
    };
    cleanupRef.current = release;

    try {
      if (audio.isBrowserGenerated) {
        if (typeof URL.createObjectURL !== "function") {
          throw new Error("Object URL is unavailable");
        }
        objectUrl = URL.createObjectURL(createDemoWave());
        audioElement.src = objectUrl;
      } else if (audio.filePath) {
        audioElement.src = audio.filePath;
      } else {
        throw new Error("Audio source is unavailable");
      }
      audioElement.load();
    } catch {
      release();
      queueMicrotask(() => {
        if (!disposed) {
          setErrorMessage("当前浏览器无法创建演示音频，请继续浏览文字和其他数字体验。");
        }
      });
    }

    return () => {
      disposed = true;
      release();
      cleanupRef.current = () => undefined;
    };
  }, [audio.filePath, audio.isBrowserGenerated]);

  const handleAudioError = () => {
    cleanupRef.current();
    setErrorMessage("演示音频暂时无法加载或播放，请继续浏览文字和其他数字体验。");
  };

  if (errorMessage) {
    return <AudioFallback audio={audio} message={errorMessage} />;
  }

  return (
    <div className="audio-card">
      <div className="audio-visual" aria-hidden="true">
        {Array.from({ length: 34 }, (_, index) => (
          <span key={index} style={{ height: `${18 + ((index * 17) % 54)}%` }} />
        ))}
      </div>
      <div className="audio-copy">
        <span className="eyebrow light">声音实验 01</span>
        <h3>{audio.name}</h3>
        <p>{audio.description}</p>
        <audio
          ref={audioRef}
          controls
          preload="metadata"
          aria-label={audio.ariaLabel ?? audio.name}
          onError={handleAudioError}
        />
      </div>
    </div>
  );
}

function GuideChat({ questions }: { questions: GuideQuestion[] }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "guide",
      text: "你好，我是“豫音”数字讲解员。当前是本地规则问答演示，我只回答已经过来源核验的问题。",
    },
  ]);
  const [input, setInput] = useState("");

  if (questions.length === 0) {
    return (
      <div className="chat-shell chat-fallback" role="status" data-module-fallback="guide">
        <div className="chat-topbar">
          <div className="guide-avatar">豫</div>
          <div>
            <strong>豫音 · 数字讲解员</strong>
            <span>当前暂无问答资料</span>
          </div>
        </div>
        <p>团队补充并审核标准问答后，此处将恢复本地问答；文物档案仍可正常浏览。</p>
      </div>
    );
  }

  const ask = (question: string) => {
    const normalized = question.trim().toLowerCase();
    if (!normalized) return;
    const answer = getLocalGuideAnswer(questions, question);
    setMessages((current) => [
      ...current,
      { role: "visitor", text: question.trim() },
      { role: "guide", text: answer },
    ]);
    setInput("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(input);
  };

  return (
    <div className="chat-shell">
      <div className="chat-topbar">
        <div className="guide-avatar">豫</div>
        <div>
          <strong>豫音 · 数字讲解员</strong>
          <span><i /> 本地知识演示</span>
        </div>
      </div>
      <div className="chat-log" aria-live="polite">
        {messages.slice(-6).map((message, index) => (
          <div className={`message ${message.role}`} key={`${message.role}-${index}-${message.text.slice(0, 8)}`}>
            {message.text}
          </div>
        ))}
      </div>
      <div className="suggested-questions">
        {questions.slice(0, 5).map((item) => (
          <button type="button" onClick={() => ask(item.question)} key={item.question}>
            {item.question}
          </button>
        ))}
      </div>
      <form className="chat-input" onSubmit={submit}>
        <label className="sr-only" htmlFor="guide-question">向数字讲解员提问</label>
        <input
          id="guide-question"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="例如：骨笛用什么材料制作？"
        />
        <button type="submit" aria-label="发送问题">发送</button>
      </form>
    </div>
  );
}

function GuideFallback({ message }: { message: string }) {
  return (
    <div className="chat-shell chat-fallback" role="status" data-module-fallback="guide">
      <div className="chat-topbar">
        <div className="guide-avatar">豫</div>
        <div>
          <strong>豫音 · 数字讲解员</strong>
          <span>本地问答暂不可用</span>
        </div>
      </div>
      <p>{message}</p>
    </div>
  );
}

type ArtifactExperienceProps = {
  artifact: Artifact;
};

export default function ArtifactExperience({ artifact }: ArtifactExperienceProps) {
  const sources = getSourcesForArtifact(artifact);
  const timeline = artifact.timeline ?? [];
  const questions = artifact.questions ?? [];
  const model = artifact.model;
  const audio = getPrimaryAudio(artifact);
  const primaryImage = getPrimaryImage(artifact);
  const modelFallbackImage =
    artifact.images?.find((image) => image.id === model?.fallbackImageId) ??
    primaryImage;

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="返回项目首页">
          <span className="brand-seal">豫</span>
          <span><strong>豫音焕新声</strong><small>河南音乐考古数字展示</small></span>
        </Link>
        <nav aria-label="主要导航">
          <Link href="/#artifacts">文物总览</Link>
          <a href="#artifact">文物档案</a>
          <a href="#timeline">历史回响</a>
          <a href="#experience">数字体验</a>
          <a href="#guide">智能讲解</a>
        </nav>
        <a className="header-action" href="#experience">进入展厅</a>
      </header>

      <section className="artifact-route-hero" id="top" aria-labelledby="artifact-route-title">
        <div className="section artifact-route-hero-inner">
          <Link className="artifact-route-back" href="/#artifacts">← 返回文物总览</Link>
          <p className="hero-kicker">HENAN MUSIC ARCHAEOLOGY</p>
          <h1 id="artifact-route-title">{artifact.name}</h1>
          {artifact.subtitle ? <p>{artifact.subtitle}</p> : null}
          <p className="concept-disclaimer">当前为概念验证Demo，非最终研究成果</p>
        </div>
      </section>

      <ArtifactDetail artifact={artifact} sources={sources} />

      <section className="timeline-section" id="timeline">
        <div className="section timeline-inner">
          <div className="section-heading split-heading light-heading">
            <div><span className="eyebrow light">02 · 历史回响</span><h2>从远古，到今天</h2></div>
            <p>不是把历史压缩成一句“最早”，而是让文物重新回到考古层位、研究过程与公共传播的时间脉络中。</p>
          </div>
          {timeline.length > 0 ? (
            <div className="timeline">
              {timeline.map((item, index) => (
                <article key={`${item.year}-${item.title}`} className="timeline-item">
                  <span className="timeline-number">{String(index + 1).padStart(2, "0")}</span>
                  <time>{item.year}</time>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="module-empty-state module-empty-dark" role="status">
              <strong>时间线资料待补充</strong>
              <p>团队提供并审核时间线资料后将在此展示。</p>
            </div>
          )}
        </div>
      </section>

      <section className="section experience-section" id="experience">
        <div className="section-heading split-heading">
          <div><span className="eyebrow">03 · 数字体验</span><h2>看见形制，听见想象</h2></div>
          <p>先用轻量模型验证交互，再接入团队采集或获得授权的真实扫描模型、复原音频与专业标注。</p>
        </div>
        <div className="experience-grid">
          <div className="viewer-column">
            <div className="card-label"><span>3D</span><div><strong>骨笛形制 · 交互模型</strong><small>THREE.JS PROCEDURAL DEMO</small></div></div>
            {model ? (
              <ModuleErrorBoundary
                key={`model-${artifact.id}`}
                fallback={(
                  <ViewerFallback
                    fallbackImage={modelFallbackImage}
                    message="3D模块发生异常，文物档案、声音和问答仍可继续使用。"
                  />
                )}
              >
                <BoneFluteViewer
                  ariaLabel={model.ariaLabel ?? "文物3D演示模型"}
                  fallbackImage={modelFallbackImage}
                />
              </ModuleErrorBoundary>
            ) : (
              <ViewerFallback
                fallbackImage={primaryImage}
                message="当前文物尚未提供可展示的3D资料。"
              />
            )}
            {model?.notice ? <p className="demo-warning">{model.notice}</p> : null}
          </div>
          <div className="feature-column">
            <article><span>01</span><div><h3>旋转观察</h3><p>从不同角度查看管身、端部与音孔排列。</p></div></article>
            <article><span>02</span><div><h3>细节缩放</h3><p>通过鼠标滚轮或触屏手势控制观察距离。</p></div></article>
            <article><span>03</span><div><h3>标注扩展</h3><p>后续可挂接尺寸、工艺、扫描精度与馆藏信息。</p></div></article>
            <div className="next-model"><span>下一步</span><strong>接入团队自采 .glb 模型</strong><p>保留当前交互层，只替换有明确来源与授权的模型资产。</p></div>
          </div>
        </div>
        {audio ? (
          <ModuleErrorBoundary
            key={`audio-${artifact.id}`}
            fallback={(
              <AudioFallback
                audio={audio}
                message="音频模块发生异常，文物档案、3D和问答仍可继续使用。"
              />
            )}
          >
            <AudioExperience audio={audio} />
          </ModuleErrorBoundary>
        ) : (
          <AudioFallback message="当前文物尚未提供可用的声音资料。" />
        )}
      </section>

      <section className="guide-section" id="guide">
        <div className="section guide-inner">
          <div className="guide-copy">
            <span className="eyebrow light">04 · 智能讲解</span>
            <h2>每一个答案，<br />都应该有出处。</h2>
            <p>这一版不伪装成已经完成的 AI 或 RAG。它用 {questions.length} 组本地问答验证交互，让团队先判断：观众会怎么问、答案需要哪些专业资料。</p>
            <ul>
              <li><span>✓</span> 本地运行，不上传提问</li>
              <li><span>✓</span> 无法匹配时明确说“不知道”</li>
              <li><span>✓</span> 后续可接入经专家审校的资料库</li>
            </ul>
          </div>
          <ModuleErrorBoundary
            key={`guide-${artifact.id}`}
            fallback={(
              <GuideFallback message="问答模块发生异常，请继续浏览已审核的固定文物资料。" />
            )}
          >
            <GuideChat questions={questions} />
          </ModuleErrorBoundary>
        </div>
      </section>

      <section className="section source-section">
        <div className="section-heading split-heading">
          <div><span className="eyebrow">05 · 来源与开源基础</span><h2>可核验，才能继续生长</h2></div>
          <p>内容与素材分开记录来源；产品结构参考开源项目，但不复制其品牌、样例数据或后台复杂度。</p>
        </div>
        {sources.length > 0 ? (
          <div className="source-grid">
            {sources.map((source, index) => (
              <a href={source.href} target="_blank" rel="noreferrer" key={source.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{source.name}</strong><small>{source.note}</small></div>
                <b>↗</b>
              </a>
            ))}
          </div>
        ) : (
          <div className="module-empty-state source-empty-state" role="status">
            <strong>资料来源待团队提供</strong>
            <p>来源完成核对后将在此列出；当前不会自动补充或推断专业资料。</p>
          </div>
        )}
        <div className="opensource-note">
          <span>OPEN SOURCE FOUNDATION</span>
          <p><a href="https://github.com/jungang/alumnet" target="_blank" rel="noreferrer">AlumNet / MIT</a> 提供数字校史展陈的产品参考；<a href="https://github.com/mrdoob/three.js" target="_blank" rel="noreferrer">Three.js / MIT</a> 提供 3D 渲染基础。当前 Demo 为独立实现。</p>
        </div>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-seal">豫</span><span><strong>豫音焕新声</strong><small>让河南音乐文物重新发声</small></span></div>
        <p>郑州大学 2026 大学生创新训练计划 · v0.3 演示版本</p>
        <span>当前为概念验证Demo，非最终研究成果 · 内容待音乐学、考古学成员持续审校</span>
      </footer>
    </main>
  );
}
