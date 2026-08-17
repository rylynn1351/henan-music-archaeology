"use client";

import { useEffect, useRef, useState } from "react";
import ArtifactImage from "./ArtifactImage";
import type { ArtifactImage as ArtifactImageData, ArtifactModel, ArtifactModelHotspot } from "../heritage-data";

export function ModelViewerFallback({ fallbackImage, message }: { fallbackImage?: ArtifactImageData; message: string }) {
  return (
    <div className="viewer-shell viewer-fallback" role="status" data-module-fallback="3d">
      <ArtifactImage image={fallbackImage} sizes="(max-width: 760px) 100vw, 58vw" fallbackText="3D与备用图片资料暂不可用" fallbackClassName="viewer-fallback-image" />
      <div className="viewer-fallback-copy"><strong>3D暂不可用</strong><p>{message}</p></div>
    </div>
  );
}

export default function ArtifactModelViewer({
  model,
  fallbackImage,
  selectedHotspotId,
  onSelectHotspot,
  audioStatusHint,
}: {
  model: ArtifactModel;
  fallbackImage?: ArtifactImageData;
  selectedHotspotId?: string;
  onSelectHotspot?: (hotspot: ArtifactModelHotspot | null) => void;
  audioStatusHint?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const hotspotLayerRef = useRef<HTMLDivElement>(null);
  const hotspotMarkerRefs = useRef(new Map<string, HTMLButtonElement>());
  const controlsRef = useRef<import("three/examples/jsm/controls/OrbitControls.js").OrbitControls | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(Boolean(model.glbPath));
  const hotspots = model.hotspots ?? [];
  const selectedHotspot = hotspots.find((hotspot) => hotspot.id === selectedHotspotId);
  const selectedHotspotIndex = selectedHotspot ? hotspots.findIndex((hotspot) => hotspot.id === selectedHotspot.id) : -1;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;
    let resizeObserver: ResizeObserver | undefined;
    let visibilityObserver: IntersectionObserver | undefined;
    let removeResizeListener: (() => void) | undefined;
    let scene: import("three").Scene | undefined;
    let renderer: import("three").WebGLRenderer | undefined;
    let controls: import("three/examples/jsm/controls/OrbitControls.js").OrbitControls | undefined;
    let isVisible = false;

    const cleanup = () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      removeResizeListener?.();
      hotspotMarkerRefs.current.clear();
      controls?.dispose();
      controlsRef.current = null;
      scene?.traverse((object) => {
        const mesh = object as import("three").Mesh;
        mesh.geometry?.dispose?.();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        materials.forEach((material) => material.dispose());
      });
      renderer?.dispose();
      renderer?.domElement.remove();
    };

    const fail = () => {
      if (disposed) return;
      cleanup();
      setErrorMessage("当前设备无法加载或继续渲染3D，请查看备用图片和文字资料。");
    };

    void (async () => {
      try {
        const { Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, MeshStandardMaterial, CylinderGeometry, HemisphereLight, DirectionalLight, Box3, Vector3, SRGBColorSpace, ACESFilmicToneMapping } = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        if (disposed) return;
        scene = new Scene();
        const camera = new PerspectiveCamera(38, 1, 0.1, 1000);
        camera.position.set(0, 0.2, 9);
        renderer = new WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = SRGBColorSpace;
        renderer.toneMapping = ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        mount.appendChild(renderer.domElement);

        let subject: import("three").Object3D;
        if (model.glbPath) {
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          const gltf = await new GLTFLoader().loadAsync(model.glbPath);
          subject = gltf.scene;
          subject.scale.setScalar(model.scale ?? 1);
          if (model.rotation) subject.rotation.set(...model.rotation);
          const box = new Box3().setFromObject(subject);
          const center = box.getCenter(new Vector3());
          subject.position.sub(center);
          const size = box.getSize(new Vector3()).length();
          camera.position.set(0, size * 0.15, Math.max(size * 1.5, 2.5));
        } else if (model.classification === "programmatic_demo") {
          const group = new Group();
          group.rotation.set(-0.12, 0, Math.PI / 2);
          const bone = new MeshStandardMaterial({ color: 0xc8a778, roughness: 0.67, metalness: 0.02 });
          const dark = new MeshStandardMaterial({ color: 0x241a14, roughness: 1 });
          group.add(new Mesh(new CylinderGeometry(0.25, 0.34, 6.1, 64, 8), bone));
          [-2.1, -1.45, -0.78, -0.08, 0.66, 1.44, 2.26].forEach((y, index) => {
            const hole = new Mesh(new CylinderGeometry(index < 2 ? 0.12 : 0.14, index < 2 ? 0.12 : 0.14, 0.05, 32), dark);
            hole.rotation.x = Math.PI / 2;
            hole.position.set(0, y, index < 3 ? 0.29 : 0.265);
            group.add(hole);
          });
          subject = group;
        } else {
          throw new Error("Model source is unavailable");
        }
        scene.add(subject);
        scene.add(new HemisphereLight(0xf5d7a6, 0x1a2421, 1.8));
        const key = new DirectionalLight(0xffe3b0, 4.2); key.position.set(3, 4, 6); scene.add(key);
        const fill = new DirectionalLight(0x9ab7a5, 2.1); fill.position.set(-5, -2, 3); scene.add(fill);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.75;
        controls.minDistance = 1;
        controls.maxDistance = 50;
        controls.saveState();
        controlsRef.current = controls;

        const hotspots = model.hotspots ?? [];
        const updateHotspotPositions = () => {
          if (!mount || !renderer || !scene || !camera || hotspots.length === 0) return;
          hotspots.forEach((hotspot) => {
            const marker = hotspotMarkerRefs.current.get(hotspot.id);
            if (!marker) return;
            const worldPosition = subject.localToWorld(new Vector3(...(hotspot.position ?? [0, 0, 0])));
            const ndc = worldPosition.project(camera);
            if (ndc.z > 1 || ndc.z < -1) {
              marker.style.visibility = "hidden";
              return;
            }
            marker.style.visibility = "visible";
            const left = ((ndc.x + 1) / 2) * mount.clientWidth;
            const top = ((1 - ndc.y) / 2) * mount.clientHeight;
            marker.style.left = `${left}px`;
            marker.style.top = `${top}px`;
          });
        };

        const resize = () => {
          if (!renderer || disposed) return;
          const width = Math.max(mount.clientWidth, 1);
          const height = Math.max(mount.clientHeight, 1);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resize();
        if (typeof ResizeObserver === "function") { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(mount); }
        else { window.addEventListener("resize", resize); removeResizeListener = () => window.removeEventListener("resize", resize); }

        const animate = () => {
          if (disposed || !isVisible || !renderer || !scene || !controls) { frame = 0; return; }
          try { controls.update(); renderer.render(scene, camera); updateHotspotPositions(); frame = requestAnimationFrame(animate); } catch { fail(); }
        };
        if (typeof IntersectionObserver === "function") {
          visibilityObserver = new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; if (isVisible && frame === 0) animate(); }, { rootMargin: "120px 0px" });
          visibilityObserver.observe(mount);
        } else { isVisible = true; animate(); }
        renderer.render(scene, camera);
        updateHotspotPositions();
        if (!disposed) setIsLoading(false);
      } catch { fail(); }
    })();

    return () => { disposed = true; cleanup(); };
  }, [model.classification, model.glbPath, model.rotation, model.scale, model.hotspots]);

  if (errorMessage) return <ModelViewerFallback fallbackImage={fallbackImage} message={errorMessage} />;
  return (
    <div className="viewer-shell" data-model-source={model.glbPath ? "glb" : "programmatic"} data-hotspot-count={hotspots.length}>
      <div ref={mountRef} className="viewer-canvas" aria-label={model.ariaLabel ?? "文物3D模型"} />
      {hotspots.length > 0 ? (
        <div ref={hotspotLayerRef} className="model-hotspot-layer">
          {hotspots.map((hotspot, index) => (
            <button
              key={hotspot.id}
              ref={(node) => { if (node) hotspotMarkerRefs.current.set(hotspot.id, node); else hotspotMarkerRefs.current.delete(hotspot.id); }}
              type="button"
              className="model-hotspot-marker"
              data-hotspot-id={hotspot.id}
              aria-label={`${index + 1}. ${hotspot.name}${hotspot.audioId ? "，点击切换关联音频" : ""}`}
              aria-pressed={selectedHotspotId === hotspot.id}
              onClick={() => onSelectHotspot?.(hotspot.id === selectedHotspotId ? null : hotspot)}
            >{index + 1}</button>
          ))}
        </div>
      ) : null}
      {selectedHotspot ? (
        <div className="model-hotspot-panel" role="status">
          <span className="model-hotspot-panel-index">热点 {selectedHotspotIndex + 1}</span>
          <strong>{selectedHotspot.name}</strong>
          {selectedHotspot.description ? <p>{selectedHotspot.description}</p> : <p>当前热点暂未提供说明。</p>}
          {audioStatusHint ? <p className="model-hotspot-audio-hint">{audioStatusHint}</p> : null}
          <button type="button" className="model-hotspot-close" onClick={() => onSelectHotspot?.(null)}>关闭</button>
        </div>
      ) : null}
      {isLoading ? <div className="viewer-loading" role="status">正在加载3D模型…</div> : null}
      <div className="viewer-overlay"><span>拖动旋转 · 滚轮或双指缩放</span><button type="button" onClick={() => controlsRef.current?.reset()}>重置视角</button></div>
    </div>
  );
}
