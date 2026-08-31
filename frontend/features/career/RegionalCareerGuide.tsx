"use client";

import { ArrowUpRight, Building2, Check, MapPin, ShieldCheck } from "lucide-react";
import { useSyncExternalStore } from "react";

type RegionKey = "hangzhou" | "quzhou" | "zhejiang";

const STORAGE_KEY = "amajia-career-region";
const REGION_CHANGE_EVENT = "amajia-career-region-change";

const regions = {
  hangzhou: {
    name: "杭州",
    label: "双城试点",
    summary: "先接入已核验的培训、认定与岗位信息。当前正在核验首批合作机构。",
    actions: [
      { title: "查看杭州家政信用信息", href: "https://jz.sww.hangzhou.gov.cn/axjz/index.html" },
      { title: "查看浙江技能评价计划", href: "https://zyjn.rlsbt.zj.gov.cn/zlbinterfice/jhgg/index.html" },
    ],
  },
  quzhou: {
    name: "衢州",
    label: "双城试点",
    summary: "家政服务员已纳入当地紧缺职业目录。平台正在对接实训与就业链路。",
    actions: [
      { title: "查看衢州培训补贴政策", href: "https://www.qz.gov.cn/art/2025/3/7/art_1229470839_2547109.html" },
      { title: "查看浙江技能评价计划", href: "https://zyjn.rlsbt.zj.gov.cn/zlbinterfice/jhgg/index.html" },
    ],
  },
  zhejiang: {
    name: "浙江其他城市",
    label: "全省覆盖",
    summary: "线上课程可正常学习；线下实训、认定和岗位将按城市逐步补齐。",
    actions: [
      { title: "查找当地培训与评价", href: "https://zynl.rlsbt.zj.gov.cn/002/client/index2.jsp" },
    ],
  },
} as const;

function readRegion(): RegionKey {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "quzhou" || saved === "zhejiang" ? saved : "hangzhou";
}

function subscribeRegion(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(REGION_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(REGION_CHANGE_EVENT, onStoreChange);
  };
}

export function RegionalCareerGuide() {
  const region = useSyncExternalStore<RegionKey>(subscribeRegion, readRegion, () => "hangzhou");
  const selected = regions[region];

  function choose(next: RegionKey) {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(REGION_CHANGE_EVENT));
  }

  return (
    <section className="career-region" aria-labelledby="career-region-title">
      <div className="career-region-heading">
        <span aria-hidden="true"><MapPin size={22} /></span>
        <div>
          <p className="section-kicker">选择学习或就业地区</p>
          <h2 id="career-region-title">先看哪个城市？</h2>
        </div>
      </div>

      <div className="career-region-options" role="radiogroup" aria-label="选择城市">
        {(Object.entries(regions) as Array<[RegionKey, (typeof regions)[RegionKey]]>).map(([key, item]) => (
          <button
            type="button"
            role="radio"
            aria-checked={region === key}
            className={region === key ? "is-selected" : ""}
            key={key}
            onClick={() => choose(key)}
          >
            <span>{item.name}</span>
            {region === key && <Check aria-hidden="true" size={19} />}
          </button>
        ))}
      </div>

      <div className="career-region-result" aria-live="polite">
        <div className="career-region-status">
          <span><Building2 aria-hidden="true" size={21} /></span>
          <div>
            <small>{selected.label}</small>
            <strong>{selected.name}上岗信息</strong>
          </div>
        </div>
        <p>{selected.summary}</p>
        <div className="career-region-links">
          {selected.actions.map((action) => (
            <a key={action.href} href={action.href} target="_blank" rel="noreferrer">
              <span>{action.title}</span>
              <ArrowUpRight aria-hidden="true" size={18} />
            </a>
          ))}
        </div>
        <p className="career-region-safe">
          <ShieldCheck aria-hidden="true" size={17} />
          只展示官方来源或已核验机构，不承诺报名、补贴或入职结果。
        </p>
      </div>
    </section>
  );
}
