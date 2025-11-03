import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  type: "measure" | "training" | "approval" | "audit";
  dueDate?: Date;
  priority: "high" | "medium" | "low";
  link: string;
}

interface MyTasksProps {
  tasks: Task[];
}

export function MyTasks({ tasks }: MyTasksProps) {
  const getTypeLabel = (type: Task["type"]) => {
    const labels = {
      measure: "Tiltak",
      training: "Opplæring",
      approval: "Godkjenning",
      audit: "Revisjon",
    };
    return labels[type];
  };

  const getTypeColor = (type: Task["type"]) => {
    const colors = {
      measure: "bg-blue-500",
      training: "bg-purple-500",
      approval: "bg-yellow-500",
      audit: "bg-green-500",
    };
    return colors[type];
  };

  const getPriorityIcon = (priority: Task["priority"]) => {
    if (priority === "high") {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (priority === "medium") {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    return <Circle className="h-4 w-4 text-gray-400" />;
  };

  const formatDueDate = (date?: Date) => {
    if (!date) return null;
    const now = new Date();
    const dueDate = new Date(date);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="text-xs text-red-600 font-semibold">
          Forfalt for {Math.abs(diffDays)} dager siden
        </span>
      );
    }
    if (diffDays === 0) {
      return <span className="text-xs text-red-600 font-semibold">Forfaller i dag!</span>;
    }
    if (diffDays === 1) {
      return <span className="text-xs text-yellow-600 font-semibold">Forfaller i morgen</span>;
    }
    if (diffDays <= 7) {
      return <span className="text-xs text-yellow-600">Om {diffDays} dager</span>;
    }
    return <span className="text-xs text-muted-foreground">Om {diffDays} dager</span>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-xl font-bold">Mine oppgaver</CardTitle>
        <Badge variant="secondary" className="text-sm">
          {tasks.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-sm font-medium">Ingen aktive oppgaver</p>
            <p className="text-xs text-muted-foreground mt-1">
              Alt er under kontroll! 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={task.link}
                className="block p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getPriorityIcon(task.priority)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${getTypeColor(task.type)}`} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {getTypeLabel(task.type)}
                      </span>
                    </div>
                    <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                    {task.dueDate && (
                      <div className="mt-1">{formatDueDate(task.dueDate)}</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

