"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, ListTodo, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroStatProps {
  title: string;
  value: number;
  subtitle: string;
  variant: "danger" | "warning" | "success" | "info";
  icon: "risk" | "check" | "todo" | "trend";
}

const iconMap = {
  risk: AlertTriangle,
  check: CheckCircle2,
  todo: ListTodo,
  trend: TrendingUp,
};

export function HeroStat({ title, value, subtitle, variant, icon }: HeroStatProps) {
  const Icon = iconMap[icon];

  const variantStyles = {
    danger: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-900",
      value: "text-red-600",
      icon: "text-red-600",
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-200",
      text: "text-yellow-900",
      value: "text-yellow-600",
      icon: "text-yellow-600",
    },
    success: {
      bg: "bg-green-50 border-green-200",
      text: "text-green-900",
      value: "text-green-600",
      icon: "text-green-600",
    },
    info: {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-900",
      value: "text-blue-600",
      icon: "text-blue-600",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card className={cn("border-2", styles.bg)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className={cn("text-sm font-medium", styles.text)}>{title}</p>
            <p className={cn("text-4xl font-bold", styles.value)}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={cn("p-3 rounded-full", styles.bg)}>
            <Icon className={cn("h-6 w-6", styles.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface HeroStatsProps {
  stats: HeroStatProps[];
}

export function HeroStats({ stats }: HeroStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, idx) => (
        <HeroStat key={idx} {...stat} />
      ))}
    </div>
  );
}

