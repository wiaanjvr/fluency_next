import type { Metadata } from "next";
// import { Inter } from "next/font/google"; // Not used, font loaded via globals.css
import "@/styles/globals.css";
import { PaddleProvider } from "@/lib/paddle";

// Font is loaded via globals.css

export const metadata: Metadata = {
  title: "Fluensea — Dive Into Fluency",
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
  // Set Paddle environment based on NODE_ENV
  const paddleEnvironment =
    process.env.NODE_ENV === "production" ? "production" : "sandbox";

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground min-h-screen transition-colors duration-300">
        <PaddleProvider environment={paddleEnvironment}>
          <div className="relative">{children}</div>
        </PaddleProvider>
      </body>
    </html>
  );
}
