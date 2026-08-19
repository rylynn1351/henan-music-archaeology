"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { getPrimaryImage, type Artifact } from "../heritage-data";
import ArtifactImage from "./ArtifactImage";
import {
  MEMORIAL_CARD,
  MEMORIAL_CARD_PALETTE as P,
  buildMemorialFilename,
  composeMemorialNicknameLine,
  dataUrlToBlob,
  fitTextBlock,
  formatMemorialDate,
  nextFocusIndex,
  truncateToFit,
} from "../memorial-card-text";

const CARD_WIDTH = 1280;
const CARD_HEIGHT = 1440;
const SAFE_LEFT = 96;
const CONTENT_WIDTH = CARD_WIDTH - SAFE_LEFT * 2;
const IMAGE_TOP = 392;
const IMAGE_HEIGHT = 610;
const NAME_TOP = 274;
const MAX_BOTTOM = CARD_HEIGHT - 48;
const FOOTER_BASELINE = 1368;
const AUTO_ROTATION_SPEED = 360 / 24000;
const DRAG_ROTATION_RATIO = 0.42;
const MAX_INERTIA_SPEED = 0.09;
const INERTIA_BLEND_MS = 420;

type ArtifactCommemorativeCardProps = {
  artifact: Artifact;
};

export function MemorialCardFallback() {
  return (
    <section className="memorial-section" aria-labelledby="memorial-fallback-title">
      <div className="section memorial-inner">
        <div className="memorial-error" role="status">
          <strong id="memorial-fallback-title">数字纪念卡暂不可用</strong>
          <p>纪念卡模块发生异常，其他内容仍可继续使用。</p>
        </div>
      </div>
    </section>
  );
}

export default function ArtifactCommemorativeCard({ artifact }: ArtifactCommemorativeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const immersiveDialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const rotationRef = useRef(0);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startRotation: 0,
    lastX: 0,
    lastTime: 0,
    angularVelocity: AUTO_ROTATION_SPEED,
  });
  const angularVelocityRef = useRef(AUTO_ROTATION_SPEED);
  const [open, setOpen] = useState(false);
  const [immersivePreview, setImmersivePreview] = useState(false);
  const [cardRotation, setCardRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [nickname, setNickname] = useState("");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [canvasError, setCanvasError] = useState<string>();
  const [downloadError, setDownloadError] = useState<string>();
  const primaryImage = getPrimaryImage(artifact);

  useEffect(() => {
    if (!primaryImage) return;
    let disposed = false;
    const nextImage = new Image();
    nextImage.onload = () => { if (!disposed) setImage(nextImage); };
    nextImage.onerror = () => { if (!disposed) setImage(null); };
    nextImage.src = primaryImage.src;
    return () => { disposed = true; };
  }, [primaryImage]);

  const drawTextBlock = (
    context: CanvasRenderingContext2D,
    block: { lines: string[]; fontSize: number; lineHeight: number; x: number; y: number; align: CanvasTextAlign; color: string; fontFamily: string; weight: number },
  ) => {
    context.font = `${block.weight} ${block.fontSize}px ${block.fontFamily}`;
    context.fillStyle = block.color;
    context.textAlign = block.align;
    block.lines.forEach((line, index) => context.fillText(line, block.x, block.y + index * block.lineHeight));
  };

  const drawCard = useCallback((canvas: HTMLCanvasElement, nicknameValue: string) => {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    const scale = canvas.width / CARD_WIDTH;
    context.save();
    context.scale(scale, scale);
    context.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    context.fillStyle = P.paper;
    context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    context.strokeStyle = P.line;
    context.lineWidth = 4;
    context.strokeRect(48, 48, CARD_WIDTH - 96, CARD_HEIGHT - 96);

    context.fillStyle = P.cinnabar;
    context.fillRect(SAFE_LEFT, 70, 68, 68);
    context.fillStyle = "#fff4df";
    context.font = `600 38px "Noto Serif SC", "Songti SC", SimSun, serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(MEMORIAL_CARD.seal, SAFE_LEFT + 34, 104);

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    drawTextBlock(context, {
      lines: [MEMORIAL_CARD.projectName],
      fontSize: 48,
      lineHeight: 52,
      x: 184,
      y: 108,
      align: "left",
      color: P.ink,
      fontFamily: '"Noto Serif SC", "Songti SC", SimSun, serif',
      weight: 700,
    });
    drawTextBlock(context, {
      lines: [MEMORIAL_CARD.projectSubtitle],
      fontSize: 22,
      lineHeight: 25,
      x: 186,
      y: 142,
      align: "left",
      color: P.inkSoft,
      fontFamily: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
      weight: 400,
    });

    const cardLabel = artifact.displayIndex
      ? `数字纪念卡 · NO. ${artifact.displayIndex}`
      : "数字纪念卡";
    drawTextBlock(context, {
      lines: [cardLabel],
      fontSize: 20,
      lineHeight: 24,
      x: CARD_WIDTH - SAFE_LEFT,
      y: 108,
      align: "right",
      color: P.cinnabar,
      fontFamily: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
      weight: 600,
    });

    context.strokeStyle = P.bone;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(SAFE_LEFT, 182);
    context.lineTo(CARD_WIDTH - SAFE_LEFT, 182);
    context.stroke();

    const nameBlock = fitTextBlock(artifact.name, CONTENT_WIDTH, 2, 68, 38);
    const nameLineHeight = Math.round(nameBlock.fontSize * 1.16);
    drawTextBlock(context, {
      ...nameBlock,
      lineHeight: nameLineHeight,
      x: SAFE_LEFT,
      y: NAME_TOP,
      align: "left",
      color: P.ink,
      fontFamily: '"Noto Serif SC", "Songti SC", SimSun, serif',
      weight: 600,
    });

    if (artifact.subtitle) {
      const subtitleBlock = fitTextBlock(artifact.subtitle, CONTENT_WIDTH, 1, 30, 22);
      drawTextBlock(context, {
        ...subtitleBlock,
        lineHeight: 36,
        x: SAFE_LEFT,
        y: NAME_TOP + (nameBlock.lines.length - 1) * nameLineHeight + subtitleBlock.fontSize + 18,
        align: "left",
        color: P.inkSoft,
        fontFamily: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
        weight: 400,
      });
    }

    const hasImage = Boolean(image && image.naturalWidth > 0);
    const imageX = SAFE_LEFT;
    const imageY = IMAGE_TOP;
    const imageWidth = CARD_WIDTH - SAFE_LEFT * 2;
    const imageHeight = IMAGE_HEIGHT;
    context.fillStyle = P.paperDeep;
    context.fillRect(imageX, imageY, imageWidth, imageHeight);
    if (hasImage) {
      const source = image as HTMLImageElement;
      const imageScale = Math.min(imageWidth / source.naturalWidth, imageHeight / source.naturalHeight);
      const drawWidth = source.naturalWidth * imageScale;
      const drawHeight = source.naturalHeight * imageScale;
      const drawX = imageX + (imageWidth - drawWidth) / 2;
      const drawY = imageY + (imageHeight - drawHeight) / 2;
      context.drawImage(source, drawX, drawY, drawWidth, drawHeight);
    } else {
      context.fillStyle = P.moss;
      context.fillRect(imageX, imageY, imageWidth, imageHeight);
      context.fillStyle = P.boneLight;
      context.font = `600 52px "Noto Serif SC", "Songti SC", SimSun, serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("数字纪念", imageX + imageWidth / 2, imageY + imageHeight / 2);
    }
    context.strokeStyle = P.line;
    context.lineWidth = 2;
    context.strokeRect(imageX, imageY, imageWidth, imageHeight);

    const caption = primaryImage?.caption ?? "";
    const credit = primaryImage?.credit ?? "";
    const label = primaryImage?.label ?? "";
    const nicknameLine = composeMemorialNicknameLine(nicknameValue);
    const captionLine = [label, caption].filter(Boolean).join(" · ");
    const captionSegments = captionLine.split("；");
    const captionBlock = captionSegments.length === 2
      ? {
          lines: [
            truncateToFit(`${captionSegments[0]}；`, 700, 23),
            truncateToFit(captionSegments[1], 700, 23),
          ],
          fontSize: 23,
          truncated: false,
        }
      : fitTextBlock(captionLine, 700, 2, 25, 19);
    const creditBlock = fitTextBlock(credit, 400, 3, 22, 17);
    const nicknameBlock = nicknameLine ? fitTextBlock(nicknameLine, CONTENT_WIDTH, 1, 38, 28) : null;
    const sloganLine = truncateToFit(MEMORIAL_CARD.slogan, CONTENT_WIDTH, 44);
    const footerLine = truncateToFit(MEMORIAL_CARD.footer, 720, 22);

    const sansFamily = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';
    const serifFamily = '"Noto Serif SC", "Songti SC", SimSun, serif';

    if (captionBlock.lines.length > 0) {
      drawTextBlock(context, {
        ...captionBlock,
        lineHeight: 32,
        x: SAFE_LEFT,
        y: 1044,
        align: "left",
        color: P.inkSoft,
        fontFamily: sansFamily,
        weight: 400,
      });
    }

    if (creditBlock.lines.length > 0) {
      drawTextBlock(context, {
        ...creditBlock,
        lineHeight: 29,
        x: CARD_WIDTH - SAFE_LEFT,
        y: 1044,
        align: "right",
        color: P.inkSoft,
        fontFamily: sansFamily,
        weight: 400,
      });
    }

    if (nicknameBlock) {
      drawTextBlock(context, {
        ...nicknameBlock,
        lineHeight: 44,
        x: CARD_WIDTH / 2,
        y: 1174,
        align: "center",
        color: P.inkSoft,
        fontFamily: serifFamily,
        weight: 500,
      });
    }

    drawTextBlock(context, {
      lines: [sloganLine],
      fontSize: 44,
      lineHeight: 52,
      x: CARD_WIDTH / 2,
      y: nicknameBlock ? 1228 : 1178,
      align: "center",
      color: P.cinnabar,
      fontFamily: serifFamily,
      weight: 500,
    });

    context.strokeStyle = P.bone;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(SAFE_LEFT, 1314);
    context.lineTo(CARD_WIDTH - SAFE_LEFT, 1314);
    context.stroke();

    drawTextBlock(context, {
      lines: [formatMemorialDate(new Date())],
      fontSize: 22,
      lineHeight: 28,
      x: SAFE_LEFT,
      y: FOOTER_BASELINE,
      align: "left",
      color: P.inkSoft,
      fontFamily: sansFamily,
      weight: 400,
    });

    drawTextBlock(context, {
      lines: [footerLine],
      fontSize: 22,
      lineHeight: 28,
      x: CARD_WIDTH - SAFE_LEFT,
      y: FOOTER_BASELINE,
      align: "right",
      color: P.inkSoft,
      fontFamily: sansFamily,
      weight: 400,
    });

    if (FOOTER_BASELINE > MAX_BOTTOM) {
      throw new Error("纪念卡文本超出安全区域");
    }
    context.restore();
  }, [artifact.displayIndex, artifact.name, artifact.subtitle, image, primaryImage]);

  const paintPreview = useCallback((nicknameValue: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      drawCard(canvas, nicknameValue);
      const dataUrl = canvas.toDataURL("image/png");
      setPreviewDataUrl(dataUrl);
      setPreviewReady(true);
      setCanvasError(undefined);
    } catch {
      setPreviewReady(false);
      setCanvasError("纪念卡预览生成失败，请关闭后重试。");
    }
  }, [drawCard]);

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    const timer = window.setTimeout(() => {
      if (!disposed) paintPreview(nickname);
    }, 120);
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [image, nickname, open, paintPreview]);

  useEffect(() => {
    if (!open) return;
    const panel = immersivePreview ? immersiveDialogRef.current : dialogRef.current;
    if (panel) panel.focus();
  }, [immersivePreview, open]);

  useEffect(() => {
    if (open) return;
    lastFocusedRef.current?.focus();
    lastFocusedRef.current = null;
  }, [open]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  const updateCardRotation = useCallback((nextRotation: number) => {
    rotationRef.current = nextRotation;
    setCardRotation(nextRotation);
  }, []);

  useEffect(() => {
    if (!immersivePreview || isDragging || reducedMotion) return;
    let animationFrame = 0;
    let previousTime = performance.now();
    const rotate = (time: number) => {
      const elapsed = Math.min(time - previousTime, 40);
      previousTime = time;
      const blend = 1 - Math.exp(-elapsed / INERTIA_BLEND_MS);
      angularVelocityRef.current += (AUTO_ROTATION_SPEED - angularVelocityRef.current) * blend;
      updateCardRotation(rotationRef.current + elapsed * angularVelocityRef.current);
      animationFrame = window.requestAnimationFrame(rotate);
    };
    animationFrame = window.requestAnimationFrame(rotate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [immersivePreview, isDragging, reducedMotion, updateCardRotation]);

  const openDialog = () => {
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNickname("");
    setCanvasError(undefined);
    setDownloadError(undefined);
    setPreviewReady(false);
    setPreviewDataUrl("");
    setImmersivePreview(false);
    updateCardRotation(0);
    angularVelocityRef.current = AUTO_ROTATION_SPEED;
    setOpen(true);
  };

  const closeDialog = useCallback(() => {
    setOpen(false);
    setImmersivePreview(false);
    setCanvasError(undefined);
    setDownloadError(undefined);
  }, []);

  const openImmersivePreview = () => {
    if (!previewReady || !previewDataUrl) return;
    updateCardRotation(0);
    angularVelocityRef.current = AUTO_ROTATION_SPEED;
    setImmersivePreview(true);
  };

  const closeImmersivePreview = useCallback(() => {
    setImmersivePreview(false);
  }, []);

  const handleCardPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now();
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startRotation: rotationRef.current,
      lastX: event.clientX,
      lastTime: now,
      angularVelocity: 0,
    };
    angularVelocityRef.current = 0;
    setIsDragging(true);
  };

  const handleCardPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const now = performance.now();
    const elapsed = Math.max(now - drag.lastTime, 1);
    const deltaX = event.clientX - drag.lastX;
    const instantVelocity = (deltaX * DRAG_ROTATION_RATIO) / elapsed;
    drag.angularVelocity = Math.max(
      -MAX_INERTIA_SPEED,
      Math.min(MAX_INERTIA_SPEED, drag.angularVelocity * 0.35 + instantVelocity * 0.65),
    );
    drag.lastX = event.clientX;
    drag.lastTime = now;
    updateCardRotation(drag.startRotation + (event.clientX - drag.startX) * DRAG_ROTATION_RATIO);
  };

  const finishCardDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    angularVelocityRef.current = Math.abs(drag.angularVelocity) < 0.002
      ? AUTO_ROTATION_SPEED
      : drag.angularVelocity;
    setIsDragging(false);
  };

  const handleCardKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    updateCardRotation(rotationRef.current + direction * 18);
    angularVelocityRef.current = reducedMotion ? 0 : AUTO_ROTATION_SPEED;
  };

  const normalizedRotation = ((cardRotation % 360) + 360) % 360;
  const isBackFacing = normalizedRotation > 90 && normalizedRotation < 270;

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (immersivePreview) closeImmersivePreview();
      else closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    const panel = immersivePreview ? immersiveDialogRef.current : dialogRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null || element === document.activeElement);
    if (focusables.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
    const next = focusables[nextFocusIndex(currentIndex, focusables.length, event.shiftKey ? "previous" : "next")];
    event.preventDefault();
    next.focus();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloadError(undefined);
    try {
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      drawCard(canvas, nickname);
    } catch {
      setDownloadError("纪念卡生成失败，请关闭后重试。");
      return;
    }
    const triggerDownload = (blob: Blob) => {
      let url: string | undefined;
      try {
        url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = buildMemorialFilename(artifact.slug);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        if (url) URL.revokeObjectURL(url);
      }
    };
    try {
      canvas.toBlob((blob) => {
        try {
          if (!blob) {
            const dataUrl = canvas.toDataURL("image/png");
            triggerDownload(dataUrlToBlob(dataUrl));
            return;
          }
          triggerDownload(blob);
        } catch {
          setDownloadError("下载失败，请重试。");
        }
      }, "image/png");
    } catch {
      setDownloadError("下载失败，请重试。");
    }
  };

  return (
    <section className="memorial-section" id="memorial" aria-labelledby="memorial-title">
      <div className="section memorial-inner">
        <div className="memorial-copy">
          <span className="eyebrow">06 · 数字纪念</span>
          <h2 id="memorial-title">把这次相遇，<br />带回身边</h2>
          <p>保存一张属于本次浏览体验的数字纪念卡。卡片仅整理当前页面已有的文物名称、图像来源与项目说明，不增加新的考古结论。</p>
          <button ref={triggerRef} type="button" className="memorial-trigger" onClick={openDialog}>
            生成数字纪念卡
          </button>
        </div>
        <figure className="memorial-chapter-visual">
          <div className="memorial-chapter-image">
            <ArtifactImage
              image={primaryImage}
              sizes="(max-width: 720px) 92vw, 52vw"
              fallbackText={`${artifact.name}图片资料待补充`}
              fallbackClassName="memorial-chapter-image-fallback"
            />
          </div>
          <figcaption>
            <span>{artifact.displayIndex ? `数字档案 · NO. ${artifact.displayIndex}` : "数字档案"}</span>
            <strong>{artifact.name}</strong>
            {primaryImage?.label ? <small>{primaryImage.label}</small> : null}
          </figcaption>
        </figure>
      </div>

      {open ? (
        <div
          className="memorial-dialog-backdrop"
          onKeyDown={handleDialogKeyDown}
        >
          <div
            ref={dialogRef}
            className="memorial-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="memorial-dialog-title"
            aria-hidden={immersivePreview ? true : undefined}
            tabIndex={-1}
          >
            <div className="memorial-dialog-header">
              <strong id="memorial-dialog-title">数字纪念卡生成</strong>
              <button type="button" aria-label="关闭" onClick={closeDialog}>×</button>
            </div>
            <div className="memorial-dialog-body">
              <div
                className="memorial-preview"
                role="img"
                aria-label={`${artifact.name}数字纪念卡预览`}
                data-ready={previewReady}
                style={previewDataUrl ? { backgroundImage: `url("${previewDataUrl}")` } : undefined}
              >
                {canvasError ? (
                  <span className="memorial-preview-error" role="status">{canvasError}</span>
                ) : !previewReady ? (
                  <span className="memorial-preview-hint">正在生成预览…</span>
                ) : null}
              </div>
              <div className="memorial-dialog-controls">
                <label className="memorial-nickname">
                  <span>纪念卡署名 <em>（可选）</em></span>
                  <input
                    type="text"
                    value={nickname}
                    maxLength={24}
                    placeholder="例如：小豫"
                    onChange={(event) => setNickname(event.target.value)}
                  />
                  <small>仅用于本次纪念卡，不会保存或上传。</small>
                </label>
                {downloadError ? <p className="memorial-download-error" role="alert">{downloadError}</p> : null}
                <div className="memorial-actions">
                  <button type="button" className="memorial-preview-action" onClick={openImmersivePreview} disabled={!previewReady}>预览纪念卡</button>
                  <button type="button" className="memorial-download" onClick={handleDownload}>下载 PNG</button>
                </div>
                <p className="memorial-trust-note">资料与授权信息取自当前文物档案；数字展示不替代正式考古资料与研究结论。</p>
              </div>
            </div>
          </div>
          {immersivePreview && previewDataUrl ? (
            <div className="memorial-immersive-backdrop">
              <div
                ref={immersiveDialogRef}
                className="memorial-immersive-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="memorial-immersive-title"
                tabIndex={-1}
              >
                <h2 id="memorial-immersive-title" className="sr-only">数字纪念卡完整预览</h2>
                <button type="button" className="memorial-preview-exit" onClick={closeImmersivePreview}>× <span>退出预览</span></button>
                <div
                  className="memorial-card-3d-stage"
                  role="group"
                  aria-label={`${artifact.name}数字纪念卡 3D 预览；左右拖动可从任意角度查看卡片`}
                  data-dragging={isDragging}
                  data-auto-rotating={!isDragging && !reducedMotion}
                  data-side={isBackFacing ? "back" : "front"}
                  tabIndex={0}
                  onPointerDown={handleCardPointerDown}
                  onPointerMove={handleCardPointerMove}
                  onPointerUp={finishCardDrag}
                  onPointerCancel={finishCardDrag}
                  onLostPointerCapture={finishCardDrag}
                  onKeyDown={handleCardKeyboard}
                >
                  <div className="memorial-card-idle-shell">
                    <div
                      className="memorial-card-flipper"
                      style={{ transform: `rotateY(${cardRotation}deg)` }}
                    >
                      <div
                        className="memorial-card-face memorial-card-front"
                        role="img"
                        aria-label={`${artifact.name}数字纪念卡正面`}
                        style={{ backgroundImage: `url("${previewDataUrl}")` }}
                      />
                      <div className="memorial-card-face memorial-card-back" role="img" aria-label="数字纪念卡背面">
                        <div className="memorial-card-back-frame">
                          <div className="memorial-card-back-heading">
                            <span className="memorial-card-back-seal">{MEMORIAL_CARD.seal}</span>
                            <p>HENAN MUSIC ARCHAEOLOGY</p>
                          </div>
                          <div className="memorial-card-back-brand">
                            <strong>{MEMORIAL_CARD.projectName}</strong>
                            <span>{MEMORIAL_CARD.projectSubtitle}</span>
                          </div>
                          <div className="memorial-card-back-motif" aria-hidden="true">
                            <i />
                            <span /><span /><span /><span /><span /><span /><span />
                          </div>
                          <div className="memorial-card-back-footer">
                            <span>{artifact.displayIndex ? `数字档案 · NO. ${artifact.displayIndex}` : "数字文化概念验证 Demo"}</span>
                            <small>{MEMORIAL_CARD.footer}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="memorial-preview-hint-text" aria-live="polite">
                  左右拖动卡片自由旋转 · 当前{isBackFacing ? "背面" : "正面"}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <canvas ref={canvasRef} className="memorial-canvas" aria-hidden="true" />
    </section>
  );
}
