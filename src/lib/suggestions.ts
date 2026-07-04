import type { Task, PomodoroSession, StreakDay } from "./db";

export interface Suggestion {
  type: "overdue" | "high-priority" | "breakdown" | "streak" | "pomodoro" | "productive-hours";
  taskId: number | null;
  text: string;
  reason: string;
}

export function getSuggestions(
  tasks: Task[],
  pomodoros: PomodoroSession[],
  _streakDays: StreakDay[],
  streak: number
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA");

  const incompleteTasks = tasks.filter((t) => !t.is_done && !t.parent_id);

  /* Overdue: created >3 days ago, not done, no parent */
  for (const task of incompleteTasks) {
    const created = new Date(task.created_at);
    const daysSinceCreated = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated >= 3) {
      suggestions.push({
        type: "overdue",
        taskId: task.id,
        text: `Complete "${task.text || "Untitled"}"`,
        reason: `Pending for ${daysSinceCreated} days`,
      });
      if (suggestions.length >= 3) break;
    }
  }

  /* High priority not started */
  if (suggestions.length < 3) {
    for (const task of incompleteTasks) {
      if (task.priority === 3) {
        suggestions.push({
          type: "high-priority",
          taskId: task.id,
          text: `Start "${task.text || "Untitled"}"`,
          reason: "High priority task not started",
        });
        if (suggestions.length >= 3) break;
      }
    }
  }

  /* Streak at risk */
  if (suggestions.length < 3 && streak > 0) {
    const completedToday = tasks.some((t) => {
      if (!t.completed_at) return false;
      return t.completed_at.startsWith(todayStr);
    });
    if (!completedToday) {
      suggestions.push({
        type: "streak",
        taskId: null,
        text: "Complete one task to keep your streak",
        reason: `${streak}-day streak at risk`,
      });
    }
  }

  /* Pomodoro count */
  if (suggestions.length < 3) {
    const todayPomodoros = pomodoros.filter((p) => {
      if (!p.completed_at) return false;
      return p.completed_at.startsWith(todayStr);
    });
    if (todayPomodoros.length === 0 && incompleteTasks.length > 0) {
      suggestions.push({
        type: "pomodoro",
        taskId: null,
        text: "Start a Pomodoro session",
        reason: "Boost focus with timed work intervals",
      });
    }
  }

  /* Breakdown suggestion: high priority with no children, created >1 day ago */
  if (suggestions.length < 3) {
    for (const task of incompleteTasks) {
      if (task.priority >= 2) {
        const created = new Date(task.created_at);
        const daysSince = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 1) {
          suggestions.push({
            type: "breakdown",
            taskId: task.id,
            text: `Break down "${task.text || "Untitled"}" into subtasks`,
            reason: "Large task might be blocking progress",
          });
          if (suggestions.length >= 3) break;
        }
      }
    }
  }

  return suggestions;
}