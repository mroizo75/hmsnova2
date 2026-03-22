"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { WidgetDefinition } from "../lib/widget-registry";

interface DashboardTileProps {
  widget: WidgetDefinition;
  isEditing: boolean;
  onRemove: () => void;
  count?: number;
}

export function DashboardTile({ widget, isEditing, onRemove, count }: DashboardTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const content = (
    <Card
      className={cn(
        "relative group border-2 transition-all duration-200 h-full",
        widget.borderColor,
        widget.bgColor,
        isDragging && "opacity-50 shadow-2xl scale-105 z-50",
        !isEditing && "hover:shadow-lg hover:scale-[1.02] cursor-pointer",
        isEditing && "cursor-default"
      )}
    >
      {isEditing && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/5"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </>
      )}

      <div className="flex flex-col items-center justify-center p-6 text-center min-h-[140px]">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-xl mb-3 transition-transform",
            widget.bgColor,
            "border",
            widget.borderColor,
            !isEditing && "group-hover:scale-110"
          )}
        >
          <widget.icon className={cn("h-7 w-7", widget.color)} />
        </div>

        <h3 className={cn("font-semibold text-sm leading-tight", widget.color)}>
          {widget.label}
        </h3>

        {count !== undefined && count > 0 && (
          <Badge
            variant="secondary"
            className={cn("mt-2 text-xs", widget.color, widget.bgColor)}
          >
            {count} {count === 1 ? "aktiv" : "aktive"}
          </Badge>
        )}
      </div>
    </Card>
  );

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        {content}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Link href={widget.href} className="block h-full">
        {content}
      </Link>
    </div>
  );
}
