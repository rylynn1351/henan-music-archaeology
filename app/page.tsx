import type { Metadata } from "next";
import HeritageDemo from "./HeritageDemo";

export const metadata: Metadata = {
  title: "河南音乐考古数字展示",
  description: "以数字档案、交互体验与可核验资料展示河南音乐考古资源。",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "豫音焕新声",
    title: "豫音焕新声｜河南音乐考古数字展示",
    description: "以数字档案、交互体验与可核验资料展示河南音乐考古资源。",
  },
};

export default function Home() {
  return <HeritageDemo />;
}
