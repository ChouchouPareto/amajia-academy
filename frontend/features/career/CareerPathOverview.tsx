import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { RegionalCareerGuide } from "./RegionalCareerGuide";
import { CareerPathStatus } from "./CareerPathStatus";

const stages = [
  { icon: ClipboardCheck, title: "了解基础", meta: "线上 · 约5分钟", body: "先做入门测一测，知道自己从哪里开始。", state: "现在可以开始" },
  { icon: BookOpenCheck, title: "学会基础技能", meta: "线上 · 6门入门课", body: "职业规范、清洁剂安全、厨房、卫生间、整理和洗衣。", state: "平台学习阶段" },
  { icon: Building2, title: "参加可靠实操", meta: "线下 · 需机构核验", body: "在合规机构练习真实工具、动作和服务流程。", state: "后续接入" },
  { icon: Award, title: "准备技能等级证书", meta: "按地区与岗位要求", body: "可关注家政服务员五级/初级工等职业技能等级；报名机构和证书需在人社部门渠道核验。", state: "需线下考试" },
  { icon: BriefcaseBusiness, title: "匹配岗位并上岗", meta: "合同、保险、岗位核验", body: "确认工作范围、报酬、休息、保险和雇主信息后再入职。", state: "就业服务阶段" },
] as const;

export function CareerPathOverview() {
  return (
    <main id="main-content" className="flow-shell career-shell">
      <header className="flow-topbar">
        <Link className="back-link" href="/">
          <ArrowLeft aria-hidden="true" size={20} />返回首页
        </Link>
        <span className="soft-chip soft-chip--mint">
          <ShieldCheck aria-hidden="true" size={16} />全流程概览
        </span>
      </header>

      <section className="career-intro">
        <p className="section-kicker">先看清全程，再决定下一步</p>
        <h1>从入门到上岗</h1>
        <p>线上课程只是第一步。真正上岗还需要实操、证书或岗位要求核验，以及可靠的就业渠道。</p>
      </section>

      <RegionalCareerGuide />

      <section className="career-map" aria-label="从入门到上岗五个阶段">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <article key={stage.title} className="career-stage">
              <div className="career-stage-line" aria-hidden="true">
                <span>{index + 1}</span>
                {index < stages.length - 1 && <i />}
              </div>
              <div className="career-stage-card">
                <span className="career-stage-icon"><Icon aria-hidden="true" size={24} /></span>
                <div>
                  <small>{stage.meta}</small>
                  <h2>{stage.title}</h2>
                  <p>{stage.body}</p>
                  <strong><CheckCircle2 aria-hidden="true" size={16} />{stage.state}</strong>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <CareerPathStatus />

      <aside className="career-certificate-note">
        <Award aria-hidden="true" size={24} />
        <div>
          <strong>证书不是平台自己发</strong>
          <p>国家职业技能标准中的家政服务员设有五级/初级工等等级；具体是否需要、报考条件和评价机构，以所在地人社部门和实际岗位要求为准。</p>
          <div>
            <a href="https://chinajob.mohrss.gov.cn/upload/resources/jnbzpdf/4ccc6a76ab911f6feae513.pdf" target="_blank" rel="noreferrer">查看国家职业技能标准</a>
            <a href="https://osta.mohrss.gov.cn/skillStandard" target="_blank" rel="noreferrer">查询证书与评价机构</a>
          </div>
        </div>
      </aside>

      <Link className="rainbow-button" href="/assessment/pre">
        <span>从入门测一测开始</span><ArrowRight aria-hidden="true" size={22} />
      </Link>
      <p className="prototype-note">本页是职业路径说明，不构成证书报考、就业或收入承诺</p>
    </main>
  );
}
