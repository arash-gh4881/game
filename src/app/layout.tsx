import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazir = Vazirmatn({
  variable: "--font-vazir",
  subsets: ["arabic"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "نگهبان آب | بازی ایزومتریک مدیریت منابع آب",
  description:
    "بازی سه‌بعدی ایزومتریک «نگهبان آب»: مدیریت منابع آب شهر آبادیان از سال ۲۰۲۰ تا ۲۰۳۶ با مخازن باران، تصفیه‌خانه، سد، سایت بازچرخانی آب و نمک‌زدایی.",
  keywords: ["بازی آب", "نگهبان آب", "مدیریت منابع آب", "بازی ایزومتریک", "Three.js", "Next.js"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazir.variable} antialiased bg-slate-950 text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
