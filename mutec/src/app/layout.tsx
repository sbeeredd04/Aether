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
  title: "Mutec - Visual AI Conversations",
  description: "Transform your AI conversations into explorable trees of thought. Create, branch, and navigate multi-threaded discussions with advanced AI models.",
  themeColor: "#10131a",
  keywords: "AI, chat, conversation, branching, multi-threaded, Gemini, visual interface",
  authors: [{ name: "Mutec Team" }],
  openGraph: {
    title: "Mutec - Visual AI Conversations",
    description: "Transform your AI conversations into explorable trees of thought",
    type: "website",
    images: ["/vercel.svg"], // Using placeholder for now
  },
  twitter: {
    card: "summary_large_image",
    title: "Mutec - Visual AI Conversations",
    description: "Transform your AI conversations into explorable trees of thought",
    images: ["/vercel.svg"], // Using placeholder for now
  },
  icons: {
    icon: "/vercel.svg", // Using placeholder for now
    shortcut: "/vercel.svg",
    apple: "/vercel.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
