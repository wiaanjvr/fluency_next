"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Settings,
  BookOpen,
  Brain,
  Sparkles,
  Trophy,
  Target,
  Flame,
  Clock,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface LeftSidebarProps {
  stats: {
    streak: number;
    wordsEncountered: number;
    totalSessions: number;
    avgComprehension: number;
    currentLevel: string;
  };
  targetLanguage: string;
  className?: string;
}

export function LeftSidebar({
  stats,
  targetLanguage,
  className,
}: LeftSidebarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const navItems = [
    {
      href: "/learn/foundation",
      icon: BookOpen,
      label: "Foundation",
      badge: stats.wordsEncountered < 100 ? "Active" : "Complete",
      badgeColor:
        stats.wordsEncountered < 100
          ? "bg-blue-500/10 text-blue-500"
          : "bg-green-500/10 text-green-500",
    },
    {
      href: "/learn/sentences",
      icon: Brain,
      label: "Sentences",
      locked: stats.wordsEncountered < 100,
    },
    {
      href: "/learn/stories",
      icon: Sparkles,
      label: "Stories",
      locked: stats.wordsEncountered < 300,
    },
  ];

  return (
    <aside
      className={cn(
        "w-64 bg-card border-r border-border/30 flex flex-col h-screen sticky top-0",
        className,
      )}
    >
      {/* Logo & Brand */}
      <div className="p-6 relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-gradient-to-r after:from-transparent after:via-border/50 after:to-transparent">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Fluency Next"
              width={40}
              height={40}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-lg font-medium">Fluency Next</span>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="p-6 space-y-4 relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-gradient-to-r after:from-transparent after:via-border/50 after:to-transparent">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Your Level</div>
          <div className="text-2xl font-semibold text-primary">
            {stats.currentLevel}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <div className="text-lg font-semibold">{stats.streak}</div>
              <div className="text-[10px] text-muted-foreground">Streak</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold">
                {stats.wordsEncountered}
              </div>
              <div className="text-[10px] text-muted-foreground">Words</div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Sessions</span>
            <span>{stats.totalSessions}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Avg. Score</span>
            <span>{stats.avgComprehension}%</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-medium text-muted-foreground mb-3 px-3">
          Learning Paths
        </div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.locked ? "#" : item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              item.locked
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-accent hover:text-accent-foreground",
            )}
            onClick={(e) => item.locked && e.preventDefault()}
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            {item.badge && (
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium",
                  item.badgeColor,
                )}
              >
                {item.badge}
              </span>
            )}
            {item.locked && (
              <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                <div className="w-2 h-2 bg-muted-foreground rounded-sm" />
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 space-y-2 relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-gradient-to-r before:from-transparent before:via-border/50 before:to-transparent">
        <Link href="/settings">
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          size="sm"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
