"use client";

import { ChevronDown, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { ModeChoices } from "./ModeChoices";

export function HomeVersionSelector({ variant = "icon" }: { variant?: "icon" | "badge" }) {
  const pathname = usePathname();
  const coachMode = pathname.startsWith("/coach");
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  function close() { dialog.current?.close(); setOpen(false); }
  return <div className={`academy-version-selector academy-version-selector--${variant}`}>
    <button className="v2-version-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen(true); dialog.current?.showModal(); }}>
      <span><strong>{coachMode ? "专业" : "基础"}</strong><small>切换版本</small></span><ChevronDown aria-hidden="true" size={16} />
    </button>
    <dialog ref={dialog} className="v2-version-dialog" aria-labelledby={titleId} onClose={() => setOpen(false)}>
      <header><h2 id={titleId}>选择学习方式</h2><button className="v2-close" type="button" aria-label="关闭版本选择" onClick={close}><X aria-hidden="true" size={22} /></button></header>
      {open && <ModeChoices onDone={close} onCancel={close} />}
    </dialog>
  </div>;
}
