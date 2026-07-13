"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { artifact, questionAnswers, sources, timeline } from "./heritage-data";

type Message = {
  role: "guide" | "visitor";
  text: string;
};

function BoneFluteViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.2, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
        new THREE.CylinderGeometry(index < 2 ? 0.12 : 0.14, index < 2 ? 0.12 : 0.14, 0.05, 32),
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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = 5;
    controls.maxDistance = 15;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.75;
    controlsRef.current = controls;

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let animationFrame = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      body.geometry.dispose();
      boneMaterial.dispose();
      edgeMaterial.dispose();
      holeMaterial.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  const resetView = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.reset();
  };

  return (
    <div className="viewer-shell">
      <div ref={mountRef} className="viewer-canvas" aria-label="可旋转的骨笛功能演示模型" />
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

function AudioExperience() {
  const [audioUrl, setAudioUrl] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(createDemoWave());
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="audio-card">
      <div className="audio-visual" aria-hidden="true">
        {Array.from({ length: 34 }, (_, index) => (
          <span key={index} style={{ height: `${18 + ((index * 17) % 54)}%` }} />
        ))}
      </div>
      <div className="audio-copy">
        <span className="eyebrow light">声音实验 01</span>
        <h3>听见远古 · 合成音色占位演示</h3>
        <p>用于验证播放、进度和音量控制；不是贾湖骨笛原件或复原件录音。</p>
        {audioUrl ? <audio controls preload="metadata" src={audioUrl} aria-label="合成占位演示音频" /> : null}
      </div>
    </div>
  );
}

function GuideChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "guide",
      text: "你好，我是“豫音”数字讲解员。当前是本地规则问答演示，我只回答已经过来源核验的问题。",
    },
  ]);
  const [input, setInput] = useState("");

  const ask = (question: string) => {
    const normalized = question.trim().toLowerCase();
    if (!normalized) return;
    const match = questionAnswers.find((item) =>
      item.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
    );
    const answer =
      match?.answer ?? "现有资料暂未收录该问题，请等待专业成员补充。你也可以试试下方的推荐问题。";
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
        {questionAnswers.slice(0, 5).map((item) => (
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

export default function HeritageDemo() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回页面顶部">
          <span className="brand-seal">豫</span>
          <span><strong>豫音焕新声</strong><small>河南音乐考古数字展示</small></span>
        </a>
        <nav aria-label="主要导航">
          <a href="#artifact">文物档案</a>
          <a href="#timeline">历史回响</a>
          <a href="#experience">数字体验</a>
          <a href="#guide">智能讲解</a>
        </nav>
        <a className="header-action" href="#experience">进入展厅</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="project-badge"><span /> 2026 大学生创新训练计划 · 国家级推荐</div>
          <p className="hero-kicker">A DIGITAL ECHO OF ANCIENT HENAN</p>
          <h1>一管骨笛<br /><em>九千年回响</em></h1>
          <p className="hero-lead">
            从贾湖出土的一件音乐文物出发，用数字叙事、3D 交互与可信讲解，
            让河南音乐考古资源被更多人看见、听见、理解。
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#artifact">开始探索 <span>→</span></a>
            <a className="button ghost" href="#experience">体验 3D 展示</a>
          </div>
          <div className="hero-stats">
            <div><strong>约 9000</strong><span>年前 · 早期标本</span></div>
            <div><strong>30+</strong><span>支 · 多轮发掘记录</span></div>
            <div><strong>5—8</strong><span>孔 · 多种形制</span></div>
          </div>
        </div>
        <div className="scroll-cue"><span /> 向下探索</div>
      </section>

      <section className="section artifact-section" id="artifact">
        <div className="section-heading split-heading">
          <div><span className="eyebrow">01 · 文物档案</span><h2>{artifact.name}</h2></div>
          <p>{artifact.summary}</p>
        </div>
        <div className="artifact-grid">
          <figure className="artifact-photo">
            <img src="/jiahu-bone-flute.jpg" alt="贾湖遗址出土骨笛的同类文物参考照片" />
            <figcaption>
              <span>参考图像</span>
              同类文物照片，摄于漯河市博物馆；非 M282:20 单件的精确对应。<br />
              ASHillocks / Wikimedia Commons / CC BY-SA 4.0
            </figcaption>
          </figure>
          <div className="artifact-details">
            <span className="big-index">NO. 001</span>
            <h3>{artifact.subtitle}</h3>
            <dl>
              <div><dt>时代</dt><dd>{artifact.era}</dd></div>
              <div><dt>年代</dt><dd>{artifact.age}</dd></div>
              <div><dt>出土</dt><dd>{artifact.excavation}</dd></div>
              <div><dt>地点</dt><dd>{artifact.location}</dd></div>
              <div><dt>材质</dt><dd>{artifact.material}</dd></div>
              <div><dt>规格</dt><dd>{artifact.length}</dd></div>
            </dl>
            <div className="research-note"><strong>研究提示</strong><p>{artifact.note}</p></div>
          </div>
        </div>
      </section>

      <section className="timeline-section" id="timeline">
        <div className="section timeline-inner">
          <div className="section-heading split-heading light-heading">
            <div><span className="eyebrow light">02 · 历史回响</span><h2>从远古，到今天</h2></div>
            <p>不是把历史压缩成一句“最早”，而是让文物重新回到考古层位、研究过程与公共传播的时间脉络中。</p>
          </div>
          <div className="timeline">
            {timeline.map((item, index) => (
              <article key={item.year} className="timeline-item">
                <span className="timeline-number">{String(index + 1).padStart(2, "0")}</span>
                <time>{item.year}</time>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
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
            <BoneFluteViewer />
            <p className="demo-warning">功能演示模型 · 非文物扫描 · 不代表真实比例、纹理与复原结论</p>
          </div>
          <div className="feature-column">
            <article><span>01</span><div><h3>旋转观察</h3><p>从不同角度查看管身、端部与音孔排列。</p></div></article>
            <article><span>02</span><div><h3>细节缩放</h3><p>通过鼠标滚轮或触屏手势控制观察距离。</p></div></article>
            <article><span>03</span><div><h3>标注扩展</h3><p>后续可挂接尺寸、工艺、扫描精度与馆藏信息。</p></div></article>
            <div className="next-model"><span>下一步</span><strong>接入团队自采 .glb 模型</strong><p>保留当前交互层，只替换有明确来源与授权的模型资产。</p></div>
          </div>
        </div>
        <AudioExperience />
      </section>

      <section className="guide-section" id="guide">
        <div className="section guide-inner">
          <div className="guide-copy">
            <span className="eyebrow light">04 · 智能讲解</span>
            <h2>每一个答案，<br />都应该有出处。</h2>
            <p>这一版不伪装成已经完成的 AI 或 RAG。它用 10 组本地问答验证交互，让团队先判断：观众会怎么问、答案需要哪些专业资料。</p>
            <ul>
              <li><span>✓</span> 本地运行，不上传提问</li>
              <li><span>✓</span> 无法匹配时明确说“不知道”</li>
              <li><span>✓</span> 后续可接入经专家审校的资料库</li>
            </ul>
          </div>
          <GuideChat />
        </div>
      </section>

      <section className="section source-section">
        <div className="section-heading split-heading">
          <div><span className="eyebrow">05 · 来源与开源基础</span><h2>可核验，才能继续生长</h2></div>
          <p>内容与素材分开记录来源；产品结构参考开源项目，但不复制其品牌、样例数据或后台复杂度。</p>
        </div>
        <div className="source-grid">
          {sources.map((source, index) => (
            <a href={source.href} target="_blank" rel="noreferrer" key={source.name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{source.name}</strong><small>{source.note}</small></div>
              <b>↗</b>
            </a>
          ))}
        </div>
        <div className="opensource-note">
          <span>OPEN SOURCE FOUNDATION</span>
          <p><a href="https://github.com/jungang/alumnet" target="_blank" rel="noreferrer">AlumNet / MIT</a> 提供数字校史展陈的产品参考；<a href="https://github.com/mrdoob/three.js" target="_blank" rel="noreferrer">Three.js / MIT</a> 提供 3D 渲染基础。当前 Demo 为独立实现。</p>
        </div>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-seal">豫</span><span><strong>豫音焕新声</strong><small>让河南音乐文物重新发声</small></span></div>
        <p>郑州大学 2026 大学生创新训练计划 · 演示模型</p>
        <span>内容待音乐学、考古学成员持续审校</span>
      </footer>
    </main>
  );
}
