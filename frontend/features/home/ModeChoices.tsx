"use client";

import { ArrowRight, BookOpenCheck, Check, MessageCircleMore } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getLearningMode, saveLearningMode } from "@/lib/api";
import { learningHome, type LearningMode, type LearningModePreference } from "@/lib/learning-mode";

const choices = [
  { mode: "basic", title: "基础版", detail: "按课程慢慢学，自己安排节奏。", Icon: BookOpenCheck },
  { mode: "coach", title: "专业版", detail: "和 AI 老师聊，一步一步陪你学。", Icon: MessageCircleMore },
] as const;

export function ModeChoices({ onDone, onCancel }: { onDone?: () => void; onCancel?: () => void }) {
  const router = useRouter();
  const [preference, setPreference] = useState<LearningModePreference | null>(null);
  const [selected, setSelected] = useState<LearningMode>("basic");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const saveLock = useRef(false);
  useEffect(() => {
    let active = true;
    getLearningMode().then((value) => {
      if (active) { setPreference(value); setSelected(value.preferred_mode); }
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "暂时无法读取版本。"); });
    return () => { active = false; };
  }, [attempt]);

  async function confirm() {
    if (!preference || saveLock.current) return;
    saveLock.current = true;
    setSaving(true); setError("");
    try {
      const saved = await saveLearningMode(selected);
      router.push(learningHome(saved.preferred_mode));
      onDone?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "没有保存成功，请重试。");
    } finally { saveLock.current = false; setSaving(false); }
  }

  return <div className="v2-mode-choices" aria-busy={saving}>
    <p className="v2-supporting">学习记录不变，下次直接进入所选首页。</p>
    {!preference && !error && <p role="status">正在读取账号版本…</p>}
    {preference && <>
      <fieldset disabled={saving}><legend className="sr-only">选择学习版本</legend>
        {choices.map(({ mode, title, detail, Icon }) => <label key={mode} className={`v2-mode-option ${selected === mode ? "is-selected" : ""}`}>
          <input type="radio" name="learning-mode" value={mode} checked={selected === mode} disabled={!preference.allowed_modes.includes(mode)} onChange={() => setSelected(mode)} />
          <Icon aria-hidden="true" size={23} />
          <span><strong>{title}{preference.preferred_mode === mode && <small>当前默认</small>}</strong><span>{detail}</span></span>
          {selected === mode && <Check aria-hidden="true" size={20} />}
        </label>)}
      </fieldset>
      <p className="v2-access-note">{preference.access_label} · 不会扣费</p>
    </>}
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    <div className="v2-modal-actions">
      {onCancel && <button className="v2-secondary" type="button" onClick={onCancel} disabled={saving}>取消</button>}
      {!preference && error ? <button className="v2-primary" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>重新读取</button>
        : <button className="v2-primary" type="button" disabled={!preference || saving} onClick={() => void confirm()}><span>{saving ? "正在保存…" : "确认选择"}</span><ArrowRight aria-hidden="true" size={19} /></button>}
    </div>
  </div>;
}
