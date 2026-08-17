"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { getPrimaryImage, type Artifact } from "../heritage-data";
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

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1440;
const SAFE_LEFT = 112;
const CONTENT_WIDTH = CARD_WIDTH - SAFE_LEFT * 2;
const IMAGE_TOP = 460;
const IMAGE_HEIGHT = 430;
const NAME_TOP = 300;
const MAX_BOTTOM = CARD_HEIGHT - 56;

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
  const previewRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
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
    context.fillRect(112, 112, 92, 92);
    context.fillStyle = "#fff4df";
    context.font = `600 52px "Noto Serif SC", "Songti SC", SimSun, serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(MEMORIAL_CARD.seal, 158, 158);

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    drawTextBlock(context, {
      lines: [MEMORIAL_CARD.projectName],
      fontSize: 64,
      lineHeight: 64,
      x: 240,
      y: 160,
      align: "left",
      color: P.ink,
      fontFamily: '"Noto Serif SC", "Songti SC", SimSun, serif',
      weight: 700,
    });
    drawTextBlock(context, {
      lines: [MEMORIAL_CARD.projectSubtitle],
      fontSize: 28,
      lineHeight: 28,
      x: 242,
      y: 208,
      align: "left",
      color: P.inkSoft,
      fontFamily: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
      weight: 400,
    });

    context.strokeStyle = P.bone;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(112, 258);
    context.lineTo(CARD_WIDTH - 112, 258);
    context.stroke();

    const nameBlock = fitTextBlock(artifact.name, CONTENT_WIDTH, 2, 56, 34);
    drawTextBlock(context, {
      ...nameBlock,
      lineHeight: Math.round(nameBlock.fontSize * 1.22),
      x: SAFE_LEFT,
      y: NAME_TOP,
      align: "left",
      color: P.ink,
      fontFamily: '"Noto Serif SC", "Songti SC", SimSun, serif',
      weight: 600,
    });

    const hasImage = Boolean(image && image.naturalWidth > 0);
    const imageX = SAFE_LEFT;
    const imageY = IMAGE_TOP;
    const imageWidth = CARD_WIDTH - SAFE_LEFT * 2;
    const imageHeight = IMAGE_HEIGHT;
    if (hasImage) {
      const source = image as HTMLImageElement;
      const scale = Math.max(imageWidth / source.naturalWidth, imageHeight / source.naturalHeight);
      const sourceWidth = imageWidth / scale;
      const sourceHeight = imageHeight / scale;
      const sourceX = (source.naturalWidth - sourceWidth) / 2;
      const sourceY = (source.naturalHeight - sourceHeight) / 2;
      context.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, imageX, imageY, imageWidth, imageHeight);
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
    const captionBlock = fitTextBlock(caption, CONTENT_WIDTH, 3, 28, 20);
    const creditBlock = fitTextBlock(credit, CONTENT_WIDTH, 2, 26, 20);
    const nicknameBlock = nicknameLine ? fitTextBlock(nicknameLine, CONTENT_WIDTH, 2, 46, 32) : null;
    const labelLine = truncateToFit(label, CONTENT_WIDTH, 28);
    const sloganLine = truncateToFit(MEMORIAL_CARD.slogan, CONTENT_WIDTH, 42);
    const footerLine = truncateToFit(MEMORIAL_CARD.footer, CONTENT_WIDTH, 32);

    const sansFamily = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';
    const serifFamily = '"Noto Serif SC", "Songti SC", SimSun, serif';
    let cursorY = IMAGE_TOP + IMAGE_HEIGHT + 18;

    if (labelLine) {
      drawTextBlock(context, {
        lines: [labelLine],
        fontSize: 28,
        lineHeight: 36,
        x: CARD_WIDTH / 2,
        y: cursorY,
        align: "center",
        color: P.cinnabar,
        fontFamily: sansFamily,
        weight: 600,
      });
      cursorY += 44;
    }

    if (captionBlock.lines.length > 0) {
      drawTextBlock(context, {
        ...captionBlock,
        lineHeight: 36,
        x: CARD_WIDTH / 2,
        y: cursorY,
        align: "center",
        color: P.inkSoft,
        fontFamily: sansFamily,
        weight: 400,
      });
      cursorY += captionBlock.lines.length * 36 + 10;
    }

    if (creditBlock.lines.length > 0) {
      drawTextBlock(context, {
        ...creditBlock,
        lineHeight: 34,
        x: CARD_WIDTH / 2,
        y: cursorY,
        align: "center",
        color: P.inkSoft,
        fontFamily: sansFamily,
        weight: 400,
      });
      cursorY += creditBlock.lines.length * 34 + 12;
    }

    if (nicknameBlock) {
      drawTextBlock(context, {
        ...nicknameBlock,
        lineHeight: Math.round(nicknameBlock.fontSize * 1.16),
        x: CARD_WIDTH / 2,
        y: cursorY,
        align: "center",
        color: P.inkSoft,
        fontFamily: serifFamily,
        weight: 500,
      });
      cursorY += nicknameBlock.lines.length * Math.round(nicknameBlock.fontSize * 1.16) + 10;
    }

    drawTextBlock(context, {
      lines: [sloganLine],
      fontSize: 42,
      lineHeight: 52,
      x: CARD_WIDTH / 2,
      y: cursorY,
      align: "center",
      color: P.cinnabar,
      fontFamily: serifFamily,
      weight: 500,
    });
    cursorY += 62;

    drawTextBlock(context, {
      lines: [formatMemorialDate(new Date())],
      fontSize: 32,
      lineHeight: 40,
      x: CARD_WIDTH / 2,
      y: cursorY,
      align: "center",
      color: P.inkSoft,
      fontFamily: sansFamily,
      weight: 400,
    });
    cursorY += 40;

    drawTextBlock(context, {
      lines: [footerLine],
      fontSize: 32,
      lineHeight: 40,
      x: CARD_WIDTH / 2,
      y: cursorY,
      align: "center",
      color: P.inkSoft,
      fontFamily: sansFamily,
      weight: 400,
    });
    cursorY += 40;

    if (cursorY > MAX_BOTTOM) {
      throw new Error("纪念卡文本超出安全区域");
    }
    context.restore();
  }, [artifact.name, image, primaryImage]);

  const paintPreview = useCallback((nicknameValue: string) => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview) return;
    try {
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      drawCard(canvas, nicknameValue);
      const dataUrl = canvas.toDataURL("image/png");
      preview.style.backgroundImage = `url("${dataUrl}")`;
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
    const panel = dialogRef.current;
    if (panel) panel.focus();
  }, [open]);

  useEffect(() => {
    if (open) return;
    lastFocusedRef.current?.focus();
    lastFocusedRef.current = null;
  }, [open]);

  const openDialog = () => {
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNickname("");
    setCanvasError(undefined);
    setDownloadError(undefined);
    setPreviewReady(false);
    setOpen(true);
  };

  const closeDialog = useCallback(() => {
    setOpen(false);
    setCanvasError(undefined);
    setDownloadError(undefined);
  }, []);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    const panel = dialogRef.current;
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
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">06 · 数字纪念</span>
            <h2 id="memorial-title">把这次相遇，带回身边</h2>
          </div>
          <p>生成一张不含考古结论的品牌纪念卡；昵称仅用于本次图片，不会保存。</p>
        </div>
        <button ref={triggerRef} type="button" className="memorial-trigger" onClick={openDialog}>
          生成数字纪念卡
        </button>
      </div>

      {open ? (
        <div
          className="memorial-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="memorial-dialog-title"
          onKeyDown={handleDialogKeyDown}
        >
          <div ref={dialogRef} className="memorial-dialog" tabIndex={-1}>
            <div className="memorial-dialog-header">
              <strong id="memorial-dialog-title">数字纪念卡</strong>
              <button type="button" aria-label="关闭" onClick={closeDialog}>×</button>
            </div>
            <div ref={previewRef} className="memorial-preview" role="img" aria-label="数字纪念卡预览">
              {canvasError ? (
                <span className="memorial-preview-error" role="status">{canvasError}</span>
              ) : !previewReady ? (
                <span className="memorial-preview-hint">正在生成预览…</span>
              ) : null}
            </div>
            <label className="memorial-nickname">
              <span>可选昵称（不保存）</span>
              <input
                type="text"
                value={nickname}
                maxLength={24}
                placeholder="留空则不显示昵称"
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>
            {downloadError ? <p className="memorial-download-error" role="alert">{downloadError}</p> : null}
            <div className="memorial-actions">
              <button type="button" className="memorial-download" onClick={handleDownload}>下载 PNG</button>
              <button type="button" className="memorial-close" onClick={closeDialog}>关闭</button>
            </div>
          </div>
        </div>
      ) : null}

      <canvas ref={canvasRef} className="memorial-canvas" aria-hidden="true" />
    </section>
  );
}
