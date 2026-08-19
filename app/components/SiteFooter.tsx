import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="brand footer-brand">
        <span className="brand-seal">豫</span>
        <span><strong>豫音焕新声</strong><small>让河南音乐文物重新发声</small></span>
      </div>
      <div className="footer-description">
        <strong>河南音乐考古数字展示平台</strong>
        <span>数字档案 · 互动展陈 · 资料溯源</span>
      </div>
      <nav aria-label="页脚导航">
        <Link href="/">项目首页</Link>
        <Link href="/artifacts">文物总览</Link>
      </nav>
    </footer>
  );
}
