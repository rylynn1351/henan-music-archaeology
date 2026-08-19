"use client";

import { FormEvent, useState } from "react";
import { getLocalGuideAnswer } from "../guide-utils";
import type { GuideQuestion } from "../heritage-data";

type Message = { role: "guide" | "visitor"; text: string };

export function GuideFallback({ message }: { message: string }) {
  return <div className="chat-shell chat-fallback" role="status" data-module-fallback="guide"><div className="chat-topbar"><div className="guide-avatar">豫</div><div><strong>豫音 · 数字讲解员</strong><span>讲解服务暂不可用</span></div></div><p>{message}</p></div>;
}

export default function ArtifactGuide({ questions }: { questions: GuideQuestion[] }) {
  const [messages, setMessages] = useState<Message[]>([{ role: "guide", text: questions.length > 0 ? "你好，我会依据本页已整理资料回答问题。你可以从推荐问题开始。" : "当前暂无问答资料，团队完成审核后将在此更新。" }]);
  const [input, setInput] = useState("");
  if (questions.length === 0) return <GuideFallback message="当前文物尚未提供经审核的问答资料。" />;
  const ask = (question: string) => {
    const normalized = question.trim();
    if (!normalized) return;
    setMessages((current) => [...current, { role: "visitor", text: normalized }, { role: "guide", text: getLocalGuideAnswer(questions, normalized) }]);
    setInput("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); ask(input); };
  return (
    <div className="chat-shell">
      <div className="chat-topbar"><div className="guide-avatar">豫</div><div><strong>豫音 · 数字讲解员</strong><span><i /> 文物资料库已载入</span></div></div>
      <div className="chat-log" aria-live="polite">{messages.slice(-6).map((message, index) => <div className={`message ${message.role}`} key={`${message.role}-${index}-${message.text.slice(0, 8)}`}>{message.text}</div>)}</div>
      <div className="suggested-questions">{questions.slice(0, 5).map((item) => <button type="button" onClick={() => ask(item.question)} key={item.question}>{item.question}</button>)}</div>
      <form className="chat-input" onSubmit={submit}><label className="sr-only" htmlFor="guide-question">向数字讲解员提问</label><input id="guide-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="输入关于当前文物的问题" /><button type="submit" aria-label="发送问题">发送</button></form>
    </div>
  );
}
