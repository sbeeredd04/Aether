import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Aether AI - Chat Multiverse",
  description: "Transform your AI conversations into explorable trees of thought. Create, branch, and navigate multi-threaded discussions with advanced AI models.",
  themeColor: "#10131a",
  keywords: "AI, chat, conversation, branching, multi-threaded, Gemini, visual interface, Aether",
  authors: [{ name: "Sri Ujjwal Reddy" }],
  openGraph: {
    title: "Aether AI- Chat Multiverse",
    description: "Transform your AI conversations into explorable trees of thought with Aether",
    type: "website",
    images: ["/aether.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aether AI- Chat Multiverse",
    description: "Transform your AI conversations into explorable trees of thought with Aether AI",
    images: ["/aether.svg"],
  },
  icons: {
    icon: "/aether.svg",
    shortcut: "/aether.svg",
    apple: "/aether.svg",
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
        <link href="https://fonts.googleapis.com/css2?family=Major+Mono+Display&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${spaceGrotesk.variable} antialiased min-h-screen font-space-grotesk`}
      >
        {children}
      </body>
    </html>
  );
}
