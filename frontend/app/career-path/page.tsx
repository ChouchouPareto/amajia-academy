import type { Metadata } from "next";

import { CareerPathOverview } from "@/features/career/CareerPathOverview";

export const metadata: Metadata = { title: "从入门到上岗｜阿嬷学院" };

export default function CareerPathPage() {
  return <CareerPathOverview />;
}
