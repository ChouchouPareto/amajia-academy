import type { Metadata } from "next";

import { InviteWelcome } from "@/features/auth/InviteWelcome";

export const metadata: Metadata = { title: "邀请码进入｜阿嬷学院" };

export default function WelcomePage() {
  return <InviteWelcome />;
}
