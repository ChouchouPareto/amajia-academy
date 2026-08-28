"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SpeakState = "idle" | "speaking" | "unsupported" | "error";

export function SpeakButton({ text, label = "播报这段内容" }: { text: string; label?: string }) {
  const [state, setState] = useState<SpeakState>("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => {
    if (utteranceRef.current && typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  function toggle() {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setState("unsupported");
      return;
    }
    if (state === "speaking") {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setState("idle");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
    utterance.lang = "zh-CN";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    const chineseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("zh"));
    if (chineseVoice) utterance.voice = chineseVoice;
    utterance.onstart = () => setState("speaking");
    utterance.onend = () => { utteranceRef.current = null; setState("idle"); };
    utterance.onerror = (event) => {
      utteranceRef.current = null;
      setState(event.error === "canceled" ? "idle" : "error");
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  const message = state === "unsupported" ? "当前浏览器不支持播报" : state === "error" ? "这次播报没有成功，请重试" : "";
  return <div className="speak-control"><button type="button" className={state === "speaking" ? "speak-button is-speaking" : "speak-button"} aria-pressed={state === "speaking"} onClick={toggle}>{state === "speaking" ? <Square aria-hidden="true" size={18} /> : <Volume2 aria-hidden="true" size={20} />}<span>{state === "speaking" ? "停止播报" : label}</span></button>{message && <span className="speak-message" role="status">{message}</span>}</div>;
}
