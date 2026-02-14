import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { PaddleProvider } from "@/lib/paddle";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lingua — Master French Through Immersive Listening",
  description:
    "An intellectual journey through French language mastery. Premium listening-first education crafted for the discerning learner.",
  keywords: [
    "French learning",
    "language acquisition",
    "immersive learning",
    "premium education",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set Paddle environment based on NODE_ENV
  const paddleEnvironment =
    process.env.NODE_ENV === "production" ? "production" : "sandbox";

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-serif antialiased bg-background text-foreground min-h-screen">
        <PaddleProvider environment={paddleEnvironment}>
          {children}
        </PaddleProvider>
      </body>
    </html>
  );
}
