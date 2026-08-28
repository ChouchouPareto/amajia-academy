"use client";

import { ArrowLeft, FileCheck2, Search, ShieldCheck, Volume2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

import { SpeakButton } from "@/components/SpeakButton";
import { answerQuestion, AppError, createQuestion } from "@/lib/api";
import type { QuestionRequest } from "@/lib/types";

const suggestions = ["厨房油污应该先擦哪里？", "清洁剂为什么不能混用？", "洗衣前应该检查什么？"];

export function KnowledgeSearch() {
  const requestKey = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QuestionRequest | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 4) { setError("请再多写一点，例如：厨房油污先擦哪里？"); return; }
    setLoading(true); setError("");
    try {
      requestKey.current ??= crypto.randomUUID();
      const created = await createQuestion(value, requestKey.current);
      setResult(await answerQuestion(created.id));
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : "暂时没有搜索成功，请稍后再试。");
    } finally { setLoading(false); }
  }

  function choose(value: string) {
    setQuery(value); setResult(null); setError(""); requestKey.current = null;
  }

  return <main id="main-content" className="knowledge-search-shell">
    <header className="knowledge-search-topbar"><Link href="/" aria-label="返回基础版首页"><ArrowLeft aria-hidden="true" size={24} />返回首页</Link><span><Search aria-hidden="true" size={18} />AI 搜索</span></header>
    <section className="knowledge-search-intro"><p className="section-kicker">独立知识检索</p><h1>想查什么家政知识？</h1><p>输入一个问题，只查找已经审核的相关知识，不进入 AI 专业陪学。</p></section>
    <form className="knowledge-search-form" onSubmit={submit} noValidate>
      <label htmlFor="knowledge-query">你的问题</label>
      <div><Search aria-hidden="true" size={22} /><input id="knowledge-query" value={query} onChange={(event) => { setQuery(event.target.value); requestKey.current = null; }} placeholder="例如：洗衣前先检查什么？" maxLength={200} /><button type="submit" disabled={loading}>{loading ? "正在搜索" : "搜索"}</button></div>
      {error && <p className="knowledge-search-error" role="alert">{error}</p>}
    </form>
    {!result && <section className="knowledge-suggestions" aria-labelledby="knowledge-suggestion-title"><h2 id="knowledge-suggestion-title">也可以直接查</h2>{suggestions.map((item) => <button key={item} type="button" onClick={() => choose(item)}><span>{item}</span><Search aria-hidden="true" size={18} /></button>)}</section>}
    {result && <SearchResult result={result} onReset={() => { setResult(null); setQuery(""); requestKey.current = null; }} />}
    <p className="knowledge-search-boundary"><ShieldCheck aria-hidden="true" size={17} />搜索和专业陪学是两个独立入口；这里不会修改课程进度。</p>
  </main>;
}

function SearchResult({ result, onReset }: { result: QuestionRequest; onReset: () => void }) {
  const available = Boolean(result.answer);
  return <section className="knowledge-result" aria-live="polite">
    <div className="knowledge-result-label"><Volume2 aria-hidden="true" size={18} /><strong>{available ? "找到相关知识" : "暂时没有可靠答案"}</strong></div>
    <h2>{result.original_text}</h2>
    {available ? <><p>{result.answer}</p><SpeakButton text={result.answer ?? ""} label="播报搜索结果" /></> : <p>{result.message ?? "相关内容仍在审核中，这次先不随便回答。"}</p>}
    {result.knowledge_refs.length > 0 && <div className="knowledge-result-sources"><strong>知识来源</strong>{result.knowledge_refs.map((source, index) => <span key={`${source.type}-${index}`}><FileCheck2 aria-hidden="true" size={16} />{source.type === "course" ? `${source.title} · 第${source.version}版` : source.name}</span>)}</div>}
    <button className="knowledge-reset" type="button" onClick={onReset}>搜索另一个问题</button>
  </section>;
}
