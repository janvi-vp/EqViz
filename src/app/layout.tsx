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
  title: "EQViz - The Equation Visualizer",
  description:
    "EQViz is a modern, interactive web app for visualizing mathematical equations and graphs. Add, edit, and plot equations with a beautiful UI.",
  keywords: [
    "math visualizer",
    "equation graph",
    "interactive math",
    "plot equations",
    "Next.js",
    "React",
    "graphing calculator",
    "education",
    "visualization",
    "EQViz"
  ],
  authors: [{ name: "Janvi VP" }],
  openGraph: {
    title: "EQViz - The Equation Visualizer",
    description:
      "Visualize and explore mathematical equations interactively with EQViz.",
    url: "https://eqviz.example.com",
    siteName: "EQViz",
    images: [
      {
        url: "/public/globe.svg",
        width: 1200,
        height: 630,
        alt: "EQViz Equation Visualizer",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EQViz - The Equation Visualizer",
    description:
      "Visualize and explore mathematical equations interactively with EQViz.",
    images: ["/public/globe.svg"],
    creator: "@janvi_vp",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
