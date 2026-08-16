import type { Metadata } from "next";
import HeritageDemo from "./HeritageDemo";

export const metadata: Metadata = {
  title: "贾湖骨笛数字展示 Demo",
  description:
    "面向河南音乐考古资源活化与传播的交互式演示：贾湖骨笛、3D 模型、演示音频与规则问答。",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "豫音焕新声",
    title: "豫音焕新声｜贾湖骨笛数字展示 Demo",
    description:
      "面向河南音乐考古资源活化与传播的交互式演示：贾湖骨笛、3D 模型、演示音频与规则问答。",
  },
};

export default function Home() {
  return <HeritageDemo />;
}
