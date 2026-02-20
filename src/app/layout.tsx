import type { Metadata } from "next";
// import { Inter } from "next/font/google"; // Not used, font loaded via globals.css
import "@/styles/globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AmbientPlayerProvider } from "@/contexts/AmbientPlayerContext";
import { AmbientPlayer } from "@/components/ambient";

// Font is loaded via globals.css

export const metadata: Metadata = {
  title: "Fluensea — Dive Into Fluensea",
  description:
    "Immerse yourself in language learning like diving into the ocean. Master any language through flow, depth, and discovery.",
  keywords: [
    "language learning",
    "fluency",
    "language acquisition",
    "comprehensible input",
    "spaced repetition",
    "immersive learning",
  ],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AmbientPlayerProvider>
            {children}
            <AmbientPlayer />
          </AmbientPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
