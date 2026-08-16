import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "豫音焕新声",
  title: {
    default: "豫音焕新声",
    template: "%s｜豫音焕新声",
  },
  description: "河南音乐考古资源数字化展示平台演示版。",
  keywords: [
    "河南音乐考古",
    "贾湖骨笛",
    "数字文物",
    "3D 文物展示",
    "豫音焕新声",
  ],
  category: "文化遗产数字展示",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
