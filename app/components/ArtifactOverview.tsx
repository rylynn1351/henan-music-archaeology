"use client";

import { useMemo, useState } from "react";
import ArtifactCard from "./ArtifactCard";
import {
  filterArtifacts,
  getArtifactFilterOptions,
  type Artifact,
} from "../heritage-data";

type ArtifactOverviewProps = {
  artifacts: readonly Artifact[];
};

export default function ArtifactOverview({ artifacts }: ArtifactOverviewProps) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("");
  const [material, setMaterial] = useState("");
  const [artifactType, setArtifactType] = useState("");

  const filterOptions = useMemo(
    () => getArtifactFilterOptions(artifacts),
    [artifacts],
  );
  const filteredArtifacts = useMemo(
    () => filterArtifacts(artifacts, { query, period, material, artifactType }),
    [artifactType, artifacts, material, period, query],
  );
  const hasActiveFilters = Boolean(
    query.trim() || period || material || artifactType,
  );

  const resetFilters = () => {
    setQuery("");
    setPeriod("");
    setMaterial("");
    setArtifactType("");
  };

  return (
    <section
      className="section artifact-overview-section"
      id="artifacts"
      data-artifact-count={artifacts.length}
      aria-labelledby="artifact-overview-title"
    >
      <div className="section-heading split-heading artifact-overview-heading">
        <div>
          <span className="eyebrow">文物总览 · COLLECTION</span>
          <h2 id="artifact-overview-title">从一件文物，建立可扩展的数字档案</h2>
        </div>
        <div className="artifact-overview-intro">
          <p>当前已公开、演示或正在整理的文物</p>
          <strong>{artifacts.length}<span> 件</span></strong>
          <small>后续文物经团队审核后，将使用同一数据结构和卡片继续扩展。</small>
        </div>
      </div>

      {artifacts.length > 0 ? (
        <>
          <fieldset className="artifact-filter-panel">
            <legend className="sr-only">文物搜索与筛选</legend>

            <label className="artifact-filter-field artifact-search-field">
              <span>名称搜索</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入文物名称关键词"
                aria-label="按文物名称搜索"
              />
            </label>

            <label className="artifact-filter-field">
              <span>年代或时期</span>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                disabled={filterOptions.periods.length === 0}
                aria-label="按年代或时期筛选"
              >
                <option value="">全部</option>
                {filterOptions.periods.map((option) => (
                  <option value={option} key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="artifact-filter-field">
              <span>材质</span>
              <select
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
                disabled={filterOptions.materials.length === 0}
                aria-label="按材质筛选"
              >
                <option value="">全部</option>
                {filterOptions.materials.map((option) => (
                  <option value={option} key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="artifact-filter-field">
              <span>器物类型</span>
              <select
                value={artifactType}
                onChange={(event) => setArtifactType(event.target.value)}
                disabled={filterOptions.artifactTypes.length === 0}
                aria-label="按器物类型筛选"
              >
                <option value="">全部</option>
                {filterOptions.artifactTypes.map((option) => (
                  <option value={option} key={option}>{option}</option>
                ))}
              </select>
            </label>
          </fieldset>

          <div className="artifact-result-bar" aria-live="polite">
            <p>
              当前结果
              <strong data-filtered-artifact-count={filteredArtifacts.length}>
                {filteredArtifacts.length}
              </strong>
              件
              <span>共 {artifacts.length} 件目录记录</span>
            </p>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              重置筛选
            </button>
          </div>

          {filteredArtifacts.length > 0 ? (
            <div className="artifact-card-grid">
              {filteredArtifacts.map((artifact) => (
                <ArtifactCard artifact={artifact} key={artifact.id} />
              ))}
            </div>
          ) : (
            <div className="artifact-overview-empty artifact-filter-empty" role="status">
              <strong>没有找到匹配的文物</strong>
              <p>请调整名称或筛选条件，也可以恢复全部可展示文物。</p>
              <button type="button" onClick={resetFilters}>恢复全部文物</button>
            </div>
          )}
        </>
      ) : (
        <div className="artifact-overview-empty" role="status">
          <strong>暂无可展示文物</strong>
          <p>文物资料完成团队审核并获准展示后，将在这里出现。</p>
        </div>
      )}

      <p className="artifact-overview-notice">
        展示内容与数字资产仍需持续审核。
      </p>
    </section>
  );
}
