export const MEMORIAL_CARD = {
  projectName: "豫音焕新声",
  projectSubtitle: "河南音乐考古数字展示",
  slogan: "让河南音乐文物重新发声",
  disclaimer: "数字展示纪念内容 · 不替代正式考古资料与研究结论",
  footer: "豫音焕新声 · 郑州大学 2026 大学生创新训练计划",
  seal: "豫",
} as const;

export const MEMORIAL_CARD_PALETTE = {
  ink: "#18231f",
  inkSoft: "#31423b",
  paper: "#f2eee5",
  paperDeep: "#e7dfd0",
  bone: "#d7ba86",
  boneLight: "#ead9b6",
  cinnabar: "#a7462e",
  moss: "#2c4239",
  line: "rgba(35, 51, 44, 0.17)",
} as const;

export function formatMemorialDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `生成于 ${date.getFullYear()}.${month}.${day}`;
}

export function composeMemorialNicknameLine(nickname?: string): string {
  const trimmed = nickname?.trim();
  return trimmed ? `致 · ${trimmed}` : "";
}

export function sanitizeMemorialSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "memorial";
}

export function buildMemorialFilename(slug: string): string {
  return `豫音焕新声-${sanitizeMemorialSlug(slug)}-纪念卡.png`;
}

export function defaultCharScale(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (char === " ") return 0.32;
  if ((code >= 0x2e80 && code <= 0x9fff) || (code >= 0x3000 && code <= 0x303f) || (code >= 0xff00 && code <= 0xffef)) {
    return 1;
  }
  return 0.55;
}

export function estimateTextWidth(
  text: string,
  fontSize: number,
  charScale: (char: string) => number = defaultCharScale,
): number {
  let width = 0;
  for (const char of text) width += charScale(char) * fontSize;
  return width;
}

export function wrapTextToLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  charScale: (char: string) => number = defaultCharScale,
): string[] {
  const lines: string[] = [];
  for (const segment of text.split("\n")) {
    let current = "";
    let currentWidth = 0;
    for (const char of segment) {
      const charWidth = charScale(char) * fontSize;
      if (current && currentWidth + charWidth > maxWidth) {
        lines.push(current);
        current = char;
        currentWidth = charWidth;
      } else {
        current += char;
        currentWidth += charWidth;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export function truncateToFit(
  text: string,
  maxWidth: number,
  fontSize: number,
  charScale: (char: string) => number = defaultCharScale,
): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (estimateTextWidth(trimmed, fontSize, charScale) <= maxWidth) return trimmed;
  const ellipsis = "…";
  let candidate = trimmed;
  while (candidate.length > 0 && estimateTextWidth(`${candidate}${ellipsis}`, fontSize, charScale) > maxWidth) {
    candidate = candidate.slice(0, -1);
  }
  return candidate ? `${candidate}${ellipsis}` : ellipsis;
}

export type FittedTextBlock = {
  lines: string[];
  fontSize: number;
  truncated: boolean;
};

export function fitTextBlock(
  text: string,
  maxWidth: number,
  maxLines: number,
  baseFontSize: number,
  minFontSize: number,
  charScale: (char: string) => number = defaultCharScale,
): FittedTextBlock {
  const trimmed = text.trim();
  if (!trimmed || maxLines <= 0 || maxWidth <= 0) {
    return { lines: [], fontSize: baseFontSize, truncated: false };
  }
  let fontSize = baseFontSize;
  while (fontSize >= minFontSize) {
    const lines = wrapTextToLines(trimmed, maxWidth, fontSize, charScale);
    if (lines.length <= maxLines) return { lines, fontSize, truncated: false };
    const next = Math.floor(fontSize * 0.9);
    if (next < minFontSize) break;
    fontSize = next;
  }
  const lines = wrapTextToLines(trimmed, maxWidth, minFontSize, charScale);
  if (lines.length <= maxLines) return { lines, fontSize: minFontSize, truncated: false };
  const kept = lines.slice(0, maxLines - 1);
  const remainder = lines.slice(maxLines - 1).join("");
  const last = truncateToFit(remainder, maxWidth, minFontSize, charScale);
  if (last) kept.push(last);
  return { lines: kept, fontSize: minFontSize, truncated: true };
}

export function nextFocusIndex(current: number, count: number, direction: "next" | "previous"): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return direction === "next" ? 0 : count - 1;
  if (direction === "next") return (current + 1) % count;
  return (current - 1 + count) % count;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Invalid data URL");
  const mime = /^data:([^;]+);/.exec(dataUrl.slice(0, comma))?.[1] ?? "image/png";
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}
