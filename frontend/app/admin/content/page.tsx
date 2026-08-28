import type { Metadata } from "next";

import { ContentReviewAdmin } from "@/features/admin/ContentReviewAdmin";

export const metadata: Metadata = { title: "内容审核｜阿嬷学院内部管理" };

export default function ContentAdminPage() {
  return <ContentReviewAdmin />;
}
