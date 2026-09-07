import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Petal Garden · florr.io 二次创作',
  description:
    '探索花园，收集花瓣，组合你的战斗配置。florr.io 非官方单机二次创作。',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
