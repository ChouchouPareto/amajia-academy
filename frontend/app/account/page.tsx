import type { Metadata } from "next";

import { AccountSettings } from "@/features/account/AccountSettings";

export const metadata: Metadata = { title: "我的账号｜阿嬷学院" };

export default function AccountPage() {
  return <AccountSettings />;
}
