import type { Metadata, Viewport } from "next";
import "./globals.css";
import SoundControl from "./SoundControl";

export const metadata: Metadata = {
  title: "にんじんダービー",
  description:
    "べんきょうして にんじんコインを あつめ、あいばを そだてて おうまレースへ！ こどもも おとなも たのしめる いくせい × けいば ゲーム。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f3ecdd",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Marcellus&family=Shippori+Mincho+B1:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <SoundControl />
      </body>
    </html>
  );
}
