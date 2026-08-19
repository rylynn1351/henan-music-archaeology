import type { GuideQuestion } from "./heritage-data";

export const GUIDE_NO_MATCH_ANSWER =
  "当前文物资料尚未涵盖该问题，请尝试下方的推荐问题。";

export function getLocalGuideAnswer(
  questions: readonly GuideQuestion[],
  question: string,
): string {
  const normalized = question.trim().toLocaleLowerCase("zh-CN");
  if (!normalized) return GUIDE_NO_MATCH_ANSWER;

  try {
    const match =
      questions.find(
        (item) => item.question.trim().toLocaleLowerCase("zh-CN") === normalized,
      ) ??
      questions.find((item) =>
        (item.keywords ?? []).some((keyword) =>
          normalized.includes(keyword.toLocaleLowerCase("zh-CN")),
        ),
      );

    return match?.answer?.trim() || GUIDE_NO_MATCH_ANSWER;
  } catch {
    return GUIDE_NO_MATCH_ANSWER;
  }
}
