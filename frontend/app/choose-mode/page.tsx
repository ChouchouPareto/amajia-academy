import Link from "next/link";
import { BrandIdentity } from "@/components/BrandIdentity";
import { ModeChoices } from "@/features/home/ModeChoices";

export default function ChooseModePage() {
  return <main id="main-content" className="mode-shell v2-mode-page">
    <header><BrandIdentity compact /><Link href="/">返回首页</Link></header>
    <section><h1>选择学习方式</h1><ModeChoices /></section>
  </main>;
}
