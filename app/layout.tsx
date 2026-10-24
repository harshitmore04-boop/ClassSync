import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClassSync — Hybrid Attendance and Personalized Recovery",
  description: "Hybrid attendance tracking, missed-topic mapping and personalized academic recovery.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
