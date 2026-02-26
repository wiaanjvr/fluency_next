import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dive Tank – Community | Fluensea",
  description:
    "Review peers, share speaking recordings, write dive logs, and connect with fellow language learners.",
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
