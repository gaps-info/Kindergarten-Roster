import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:4178";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "幼兒園課後輪值公告",
    description: "查看最新早值與課後輪值安排。",
    openGraph: { title: "幼兒園課後輪值公告", description: "最新排班・手機快速查看", images: [{ url: image, width: 1733, height: 909 }] },
    twitter: { card: "summary_large_image", title: "幼兒園課後輪值公告", description: "最新排班・手機快速查看", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
