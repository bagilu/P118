import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "P118 先民地圖",
  description: "以年代探索臺灣考古文化分布，並下載透明 PNG 與可編輯 SVG。",
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
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <html lang="zh-Hant">
      <body className="antialiased">
        <script src={`${basePath}/config.js`} />
        {children}
      </body>
    </html>
  );
}
