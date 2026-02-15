import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Crimson_Pro } from "next/font/google";
import "@/styles/globals.css";
import { PaddleProvider } from "@/lib/paddle";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
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
    <html
      lang="en"
      className={`${plusJakarta.variable} ${crimsonPro.variable}`}
    >
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <PaddleProvider environment={paddleEnvironment}>
          {children}
        </PaddleProvider>
      </body>
    </html>
  );
}
