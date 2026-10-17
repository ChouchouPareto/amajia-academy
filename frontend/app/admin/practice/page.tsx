import type { Metadata } from "next";
import { PracticeReviewAdmin } from "@/features/admin/PracticeReviewAdmin";
export const metadata: Metadata = { title: "复述复核｜阿嬷学院" };
export default function Page() { return <PracticeReviewAdmin />; }
