import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daily Discounts Promotion Planner",
  description: "Professional promotion planning tool for retail businesses",
  icons: {
    icon: "/dd logo-01.png",
    shortcut: "/dd logo-01.png",
    apple: "/dd logo-01.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/dd logo-01.png" type="image/png" />
        <link rel="shortcut icon" href="/dd logo-01.png" type="image/png" />
        <link rel="apple-touch-icon" href="/dd logo-01.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
