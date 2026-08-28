"use client";

import { ArrowLeft, FileCheck2, Search, ShieldCheck, Volume2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { SpeakButton } from "@/components/SpeakButton";
import { AppError, searchKnowledge } from "@/lib/api";
import type { KnowledgeSearchResult } from "@/lib/types";

const suggestions = ["厨房油污应该先擦哪里？", "清洁剂为什么不能混用？", "洗衣前应该检查什么？"];

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<KnowledgeSearchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 4) { setError("请再多写一点，例如：厨房油污先擦哪里？"); return; }
    setLoading(true); setError("");
    try {
      setResult(await searchKnowledge(value));
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : "暂时没有搜索成功，请稍后再试。");
    } finally { setLoading(false); }
  }

  function choose(value: string) {
    setQuery(value); setResult(null); setError("");
  }

  return <main id="main-content" className="knowledge-search-shell">
    <header className="knowledge-search-topbar"><Link href="/" aria-label="返回基础版首页"><ArrowLeft aria-hidden="true" size={24} />返回首页</Link><span><Search aria-hidden="true" size={18} />AI 搜索</span></header>
    <section className="knowledge-search-intro"><p className="section-kicker">独立知识检索</p><h1>想查什么家政知识？</h1><p>输入一个问题，只查找已经审核的相关知识，不进入 AI 专业陪学。</p></section>
    <form className="knowledge-search-form" onSubmit={submit} noValidate>
      <label htmlFor="knowledge-query">你的问题</label>
      <div><Search aria-hidden="true" size={22} /><input id="knowledge-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：洗衣前先检查什么？" maxLength={120} /><button type="submit" disabled={loading}>{loading ? "正在搜索" : "搜索"}</button></div>
      {error && <p className="knowledge-search-error" role="alert">{error}</p>}
    </form>
    {!result && <section className="knowledge-suggestions" aria-labelledby="knowledge-suggestion-title"><h2 id="knowledge-suggestion-title">也可以直接查</h2>{suggestions.map((item) => <button key={item} type="button" onClick={() => choose(item)}><span>{item}</span><Search aria-hidden="true" size={18} /></button>)}</section>}
    {result && <SearchResult result={result} onReset={() => { setResult(null); setQuery(""); }} />}
    <p className="knowledge-search-boundary"><ShieldCheck aria-hidden="true" size={17} />搜索和专业陪学是两个独立入口；这里不会修改课程进度。</p>
  </main>;
}

function SearchResult({ result, onReset }: { result: KnowledgeSearchResult; onReset: () => void }) {
  const available = result.hits.length > 0;
  const speech = result.hits.slice(0, 3).map((hit) => `${hit.title}，${hit.content}`).join("。安全提醒：") + (result.hits[0]?.disclaimer ?? "");
  return <section className="knowledge-result" aria-live="polite">
    <div className="knowledge-result-label"><Volume2 aria-hidden="true" size={18} /><strong>{available ? "找到相关知识" : "暂时没有可靠答案"}</strong></div>
    <h2>{result.query}</h2>
    {!available && <p>{result.message}</p>}
    {available && <><div className="knowledge-hit-list">{result.hits.map((hit) => <article key={`${hit.course_version_id}-${hit.section}`}><span>{hit.title} · {hit.section}</span><p>{hit.content}</p>{hit.disclaimer && <small><ShieldCheck aria-hidden="true" size={15} />{hit.disclaimer}</small>}<div><FileCheck2 aria-hidden="true" size={15} />已审核课程 · 第{hit.version}版</div></article>)}</div><SpeakButton text={speech} label="播报搜索结果" /></>}
    {available && <p className="knowledge-retrieval-mode">{result.retrieval_mode === "hybrid_embedding" ? "关键词与语义联合检索" : "已发布课程关键词检索"}</p>}
    <button className="knowledge-reset" type="button" onClick={onReset}>搜索另一个问题</button>
  </section>;
}
