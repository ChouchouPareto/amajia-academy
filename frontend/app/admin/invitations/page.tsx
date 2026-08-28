import type { Metadata } from "next";

import { InvitationAdmin } from "@/features/admin/InvitationAdmin";

export const metadata: Metadata = { title: "测试邀请码｜阿嬷学院内部管理" };

export default function InvitationAdminPage() {
  return <InvitationAdmin />;
}
