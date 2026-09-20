import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/components/reactbits/PillNav.css";
import "@/components/reactbits/SpecularButton.css";
import "./ui-v2.css";

export const metadata: Metadata = {
  title: "阿嬷学院｜从家政入门，学会一门新本事",
  description: "面向40至60岁女性的家政入门学习内测产品",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eef2f5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
