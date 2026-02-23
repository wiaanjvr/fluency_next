import { ConjugationDrill } from "@/components/conjugation/ConjugationDrill";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const metadata = {
  title: "Conjugation Drill — Fluensea",
  description:
    "Master verb conjugations through smart, weighted drills with instant feedback and grammar explanations.",
};

export default function ConjugationPage() {
  return (
    <ProtectedRoute>
      <ConjugationDrill />
    </ProtectedRoute>
  );
}
