import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Jua } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Rounded, friendly Korean display font used for the brand name.
const jua = Jua({
  variable: "--font-brand",
  weight: "400",
  // Korean glyphs ship as unicode-range slices and load on demand; only latin is preloadable.
  subsets: ["latin"],
});

const SITE_NAME = "포갠";
const TITLE = "포갠 | 속마음을 안전하게 나누는 익명 블로그";
const DESCRIPTION =
  "이불 속처럼 포근한 공간에서 속마음을 안전하게 털어놓으세요. 포갠은 서로의 이야기에 따뜻하게 공감하는 익명 블로그입니다.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://gn-blog-v2-zeta.vercel.app",
  ),
  title: { default: TITLE, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFF4E6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${jua.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
