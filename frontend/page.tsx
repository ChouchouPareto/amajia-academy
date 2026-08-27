import { ArrowRight, Check, Clock3, Search, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AppHeader } from "@/components/AppHeader";
import SoftAurora from "@/components/SoftAurora";

const questions = [
  { category: "家政清洁", tone: "mint", title: "厨房油污，应该先擦哪里？", time: "3分钟" },
  { category: "育儿照护", tone: "peach", title: "孩子睡前总拖延，怎么安排顺序？", time: "4分钟" },
  { category: "家庭整理", tone: "sky", title: "家里东西太多，应该从哪里开始收？", time: "3分钟" },
];

export default function HomePage() {
  return (
    <main id="main-content" className="home-shell">
      <div className="home-aurora" aria-hidden="true">
        <SoftAurora
          speed={0.14}
          scale={1.25}
          brightness={0.55}
          color1="#b8dff4"
          color2="#ffd3ba"
          noiseFrequency={1.8}
          noiseAmplitude={0.65}
          bandHeight={0.46}
          bandSpread={0.85}
          octaveDecay={0.22}
          layerOffset={0.55}
          colorSpeed={0.25}
          enableMouseInteraction={false}
        />
      </div>
      <AppHeader current="home" />

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <p className="home-eyebrow"><Sparkles aria-hidden="true" size={16} />家政 · 育儿 · 家庭学习</p>
          <h1 id="home-title" className="home-display-title">
            生活里的难题，<br />也能<span className="rainbow-word">一步一步</span>学会。
          </h1>
          <p className="home-hero-copy">不用会搜索，不用看长文章。说清一个问题，我们把可靠内容整理成听得懂、跟得上的小步骤。</p>

          <Link className="rainbow-cta home-primary-cta" href="/ask">
            <span className="rainbow-cta__inner">
              <Search aria-hidden="true" size={22} />
              <span>输入你想学的问题</span>
              <ArrowRight aria-hidden="true" size={22} />
            </span>
          </Link>
          <div className="home-trust-line" aria-label="产品特点">
            <span><ShieldCheck aria-hidden="true" size={17} />先确认，再回答</span>
            <span><Check aria-hidden="true" size={17} />一次只学一件事</span>
          </div>
        </div>

        <div className="home-visual" aria-label="家政、家庭整理和育儿学习场景">
          <div className="collage-frame">
            <Image
              className="home-collage"
              src="/images/home-learning-collage-v2.png"
              alt="一位中年女性在厨房记录清洁步骤、整理衣物和学习育儿知识的生活场景拼贴"
              width={1536}
              height={1024}
              priority
              sizes="(max-width: 760px) 94vw, 52vw"
            />
          </div>
          <div className="floating-time-card"><Clock3 aria-hidden="true" size={18} /><span><strong>3～5分钟</strong>学一个问题</span></div>
          <div className="floating-ui-card" aria-hidden="true">
            <div><span>第1步</span><small>共3步</small></div>
            <strong>先把台面腾空</strong>
            <i><b /></i>
          </div>
        </div>
      </section>

      <section className="home-question-section" aria-labelledby="question-title">
        <div className="home-section-heading">
          <div>
            <p className="section-kicker">不会写也没关系</p>
            <h2 id="question-title">从一个生活问题开始</h2>
          </div>
          <Link href="/ask">自己写问题<ArrowRight aria-hidden="true" size={19} /></Link>
        </div>
        <div className="home-question-grid">
          {questions.map((question) => (
            <Link key={question.title} className="home-question-card" href={`/ask?example=${encodeURIComponent(question.title)}`}>
              <div className={`question-art question-art--${question.tone}`} aria-hidden="true">
                <span>{question.category.slice(0, 1)}</span>
                <i /><b />
              </div>
              <div className="home-question-card__content">
                <span>{question.category}<small><Clock3 aria-hidden="true" size={14} />{question.time}</small></span>
                <strong>{question.title}</strong>
                <em>开始学习<ArrowRight aria-hidden="true" size={18} /></em>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="prototype-note">内部前端演示 · 当前内容尚未经过专业审核</footer>
    </main>
  );
}
