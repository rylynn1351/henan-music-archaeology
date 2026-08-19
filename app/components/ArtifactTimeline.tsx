"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { TimelineItem } from "../heritage-data";

type ArtifactTimelineProps = {
  items: TimelineItem[];
  breakAfter?: number;
  breakLabel?: string;
};

export default function ArtifactTimeline({ items, breakAfter, breakLabel }: ArtifactTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string>();
  const [focusedId, setFocusedId] = useState<string>();
  const [compactActiveId, setCompactActiveId] = useState<string>();
  const [isCompact, setIsCompact] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const hoverCloseTimerRef = useRef<number | undefined>(undefined);
  const validBreakAfter = typeof breakAfter === "number" && breakAfter >= 0 && breakAfter < items.length - 1
    ? breakAfter
    : undefined;
  const activeId = isCompact ? compactActiveId : hoveredId ?? focusedId;
  const activeIndex = items.findIndex((item) => item.id === activeId);

  useEffect(() => () => {
    if (hoverCloseTimerRef.current !== undefined) window.clearTimeout(hoverCloseTimerRef.current);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 820px)");
    const syncLayout = () => {
      setIsCompact(mediaQuery.matches);
      setHoveredId(undefined);
      setFocusedId(undefined);
      setCompactActiveId(undefined);
    };
    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  const showTemporary = (id: string) => {
    if (isCompact) return;
    if (hoverCloseTimerRef.current !== undefined) window.clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = undefined;
    setHoveredId(id);
  };

  const hideTemporary = () => {
    if (hoverCloseTimerRef.current !== undefined) window.clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = window.setTimeout(() => {
      setHoveredId(undefined);
      hoverCloseTimerRef.current = undefined;
    }, 100);
  };

  const toggleAllEvents = () => {
    setHoveredId(undefined);
    setFocusedId(undefined);
    setCompactActiveId(undefined);
    setShowAll((current) => !current);
  };

  if (items.length === 0) {
    return (
      <section className="timeline-section" id="timeline">
        <div className="section timeline-inner">
          <div className="section-heading stacked-heading light-heading">
            <span className="eyebrow light">02 · 历史回响</span>
            <h2>从远古，到今天</h2>
            <p>让文物回到考古层位、研究过程与公共传播的时间脉络中。</p>
          </div>
          <div className="module-empty-state module-empty-dark" role="status">
            <strong>时间线资料待补充</strong>
            <p>团队提供并审核时间线资料后将在此展示。</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="timeline-section" id="timeline" aria-labelledby="timeline-title">
      <div className="section timeline-inner">
        <div className="timeline-heading-row">
          <div className="section-heading stacked-heading light-heading">
            <span className="eyebrow light">02 · 历史回响</span>
            <h2 id="timeline-title">从远古，到今天</h2>
            <p>让文物回到考古层位、研究过程与公共传播的时间脉络中。</p>
          </div>
          <button
            type="button"
            className="timeline-read-all-toggle"
            aria-expanded={showAll}
            aria-controls="timeline-event-view"
            onClick={toggleAllEvents}
          >
            {showAll ? "← 返回时间轴" : "查看全部事件 ↓"}
          </button>
        </div>

        <div className="timeline-view-shell" data-mode={showAll ? "archive" : "timeline"}>
          {showAll ? (
            <div
              className="timeline-archive-view"
              id="timeline-event-view"
              aria-label="全部历史事件档案总览"
              style={{ "--timeline-event-count": items.length } as CSSProperties}
            >
              {items.map((item, index) => (
                <article className="timeline-archive-item" key={item.id}>
                  <span className="timeline-archive-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <time>{item.year}</time>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div
              className="timeline-explorer"
              id="timeline-event-view"
              aria-label="历史事件交互时间轴"
              onPointerDown={(event) => {
                if (!isCompact || !compactActiveId) return;
                if (!(event.target as Element).closest(".timeline-event")) setCompactActiveId(undefined);
              }}
            >
              {validBreakAfter !== undefined ? (
                <div className="timeline-era-labels" aria-hidden="true">
                  <span>远古</span>
                  <span>现代考古与传播</span>
                </div>
              ) : null}
              <div className="timeline-axis">
                {items.map((item, index) => {
                  const isActive = activeId === item.id;
                  const isReached = activeIndex >= index;
                  const isPassed = activeIndex > index;
                  const tooltipSide = index % 2 === 0 ? "top" : "bottom";
                  const edge = index === 0 ? "start" : index === items.length - 1 ? "end" : "middle";
                  return (
                    <Fragment key={item.id}>
                      <article
                        className="timeline-event"
                        data-active={isActive}
                        data-reached={isReached}
                        data-passed={isPassed}
                        data-side={tooltipSide}
                        data-edge={edge}
                        onMouseEnter={() => showTemporary(item.id)}
                        onMouseLeave={hideTemporary}
                        onFocusCapture={() => { if (!isCompact) setFocusedId(item.id); }}
                        onBlurCapture={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedId(undefined);
                        }}
                      >
                        <span className="timeline-line timeline-line-before" aria-hidden="true" />
                        <span className="timeline-line timeline-line-after" aria-hidden="true" />
                        <button
                          type="button"
                          className="timeline-node"
                          aria-expanded={isActive}
                          aria-controls={`timeline-detail-${item.id}`}
                          onClick={(event) => {
                            if (isCompact) {
                              setCompactActiveId((current) => current === item.id ? undefined : item.id);
                            } else if (event.detail > 0) {
                              event.currentTarget.blur();
                              setFocusedId(undefined);
                            }
                          }}
                        >
                          <span className="timeline-node-dot" aria-hidden="true" />
                          <time>{item.year}</time>
                          <strong>{item.title}</strong>
                        </button>
                        {isActive ? (
                          <div
                            className="timeline-popover"
                            id={`timeline-detail-${item.id}`}
                            role="region"
                            aria-label={`${item.year} ${item.title}`}
                          >
                            <time>{item.year}</time>
                            <h3>{item.title}</h3>
                            <p>{item.text}</p>
                          </div>
                        ) : null}
                      </article>
                      {index === validBreakAfter ? (
                        <div
                          className="timeline-break"
                          data-active={activeIndex > index}
                          role="separator"
                          aria-label={breakLabel ?? "时间跨度"}
                        >
                          <span className="timeline-break-line" aria-hidden="true" />
                          <b aria-hidden="true">╱╱</b>
                          <small>{breakLabel ?? "较长时间跨度"}</small>
                        </div>
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>
            <p className="timeline-interaction-hint">
              <span>悬停或键盘聚焦节点快速查看</span>
              <span>轻触节点查看事件 · 轻触空白处收起</span>
            </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
