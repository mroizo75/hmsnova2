"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  ListTodo,
  ClipboardCheck,
  GraduationCap,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
}

const iconMap = {
  FileText,
  AlertTriangle,
  AlertCircle,
  ListTodo,
  ClipboardCheck,
  GraduationCap,
  Target,
};

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  const variantStyles = {
    default: "text-foreground",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  const Icon = iconMap[icon as keyof typeof iconMap] || FileText;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", variantStyles[variant])} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", variantStyles[variant])}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs mt-1 flex items-center gap-1",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            <span>{trend.isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value)}% fra forrige måned</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

