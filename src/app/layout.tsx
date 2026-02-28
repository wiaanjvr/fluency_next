import type { Metadata } from "next";
// import { Inter } from "next/font/google"; // Not used, font loaded via globals.css
import "@/styles/globals.css";
import "katex/dist/katex.min.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ActiveLanguageProvider } from "@/contexts/ActiveLanguageContext";
import { AmbientPlayerProvider } from "@/contexts/AmbientPlayerContext";
import { KnowledgeProvider } from "@/contexts/KnowledgeContext";
import { AmbientPlayer } from "@/components/ambient";
import {
  ImmerseProvider,
  ImmersePlayer,
  ImmerseSelectModal,
} from "@/components/immerse";
import { ProfileLocationSync } from "@/components/ProfileLocationSync";

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
        <LocationProvider>
          <AuthProvider>
            <ProfileLocationSync />
            <ActiveLanguageProvider>
              <KnowledgeProvider>
                <AmbientPlayerProvider>
                  <ImmerseProvider>
                    {children}
                    <AmbientPlayer />
                    <ImmersePlayer />
                    <ImmerseSelectModal />
                  </ImmerseProvider>
                </AmbientPlayerProvider>
              </KnowledgeProvider>
            </ActiveLanguageProvider>
          </AuthProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
