import LessonFlow from "@/components/lesson-v2/LessonFlow";

export const metadata = {
  title: "Lesson | Lingua",
};

export default function LessonV2Page() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <LessonFlow />
      </div>
    </main>
  );
}
