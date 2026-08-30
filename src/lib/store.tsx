import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, differenceInCalendarDays, parseISO } from "date-fns";

/* ————————————————— types (mirror the Supabase schema) ————————————————— */
export type Category = { id: string; name: string; weight: number };
export type GradeItem = { id: string; categoryId: string; name: string; score: number; max: number; date: string };
export type Course = {
  id: string;
  code: string;
  name: string;
  color: string;
  credits: number;
  professor: string;
  categories: Category[];
  items: GradeItem[];
};
export type Priority = 0 | 1 | 2; // low / med / high
export type Task = {
  id: string;
  title: string;
  courseId: string | null;
  due: string; // yyyy-MM-dd
  priority: Priority;
  done: boolean;
  createdAt: number;
};
export type Settings = {
  theme: "dark" | "light";
  passcode: string | null;
  setupDone: boolean;
  biometric: boolean;
  autoLock: boolean;
  notifications: boolean;
  remindHours: 1 | 24 | 48;
  offline: boolean;
};
export type State = {
  version: number;
  courses: Course[];
  tasks: Task[];
  settings: Settings;
  lastSync: number;
  pending: number;
};
export type ToastKind = "ok" | "warn" | "err";
export type Toast = { id: string; msg: string; kind: ToastKind; action?: { label: string; fn: () => void } };

/* ————————————————— helpers ————————————————— */
export const uid = () => Math.random().toString(36).slice(2, 10);
export const haptic = (ms = 12) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
};
export const dayISO = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");
export const todayISO = () => dayISO(0);

export const GRADE_COLORS: Record<string, string> = {
  A: "#31c48d",
  B: "#4dabf7",
  C: "#f0b429",
  D: "#f2884b",
  F: "#f0605c",
};

export function letterFor(pct: number | null): string {
  if (pct == null) return "–";
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 67) return "D+";
  if (pct >= 63) return "D";
  if (pct >= 60) return "D-";
  return "F";
}
export const LETTER_MIN: Record<string, number> = {
  A: 93, "A-": 90, "B+": 87, B: 83, "B-": 80, "C+": 77, C: 73, "C-": 70, "D+": 67, D: 63, "D-": 60, F: 0,
};
export const gradeColor = (pct: number | null) =>
  pct == null ? "var(--faint)" : GRADE_COLORS[letterFor(pct).charAt(0)];

export function pointsFor(pct: number): number {
  const l = letterFor(pct);
  const map: Record<string, number> = { A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7, "C+": 2.3, C: 2.0, "C-": 1.7, "D+": 1.3, D: 1.0, "D-": 0.7, F: 0 };
  return map[l];
}

/* ————————————————— grade math ————————————————— */
export function categoryAvg(course: Course, categoryId: string): number | null {
  const items = course.items.filter((i) => i.categoryId === categoryId && i.max > 0);
  if (!items.length) return null;
  return items.reduce((s, i) => s + (i.score / i.max) * 100, 0) / items.length;
}
/** earned points (0–gradedWeight) and gradedWeight (sum of category weights that have grades) */
export function courseEarned(course: Course) {
  let earned = 0;
  let gradedWeight = 0;
  for (const cat of course.categories) {
    const avg = categoryAvg(course, cat.id);
    if (avg != null) {
      earned += (avg / 100) * cat.weight;
      gradedWeight += cat.weight;
    }
  }
  return { earned, gradedWeight };
}
export function coursePct(course: Course): number | null {
  const { earned, gradedWeight } = courseEarned(course);
  if (gradedWeight === 0) return null;
  return (earned / gradedWeight) * 100;
}
export function gpa(courses: Course[]): number | null {
  let pts = 0;
  let cr = 0;
  for (const c of courses) {
    const p = coursePct(c);
    if (p != null) {
      pts += pointsFor(p) * c.credits;
      cr += c.credits;
    }
  }
  return cr === 0 ? null : pts / cr;
}
export function overallPct(courses: Course[]): number | null {
  let s = 0;
  let cr = 0;
  for (const c of courses) {
    const p = coursePct(c);
    if (p != null) {
      s += p * c.credits;
      cr += c.credits;
    }
  }
  return cr === 0 ? null : s / cr;
}

/** What-if: assume a score in the target (ungraded) category */
export function whatIf(course: Course, assumedPct: number) {
  const ungraded = course.categories
    .filter((c) => categoryAvg(course, c.id) == null)
    .sort((a, b) => b.weight - a.weight);
  const target = ungraded[0] ?? null;
  const { earned, gradedWeight } = courseEarned(course);
  if (!target) return { target: null as Category | null, current: coursePct(course), simulated: coursePct(course) };
  const simulated = ((earned + (assumedPct / 100) * target.weight) / (gradedWeight + target.weight)) * 100;
  return { target, current: coursePct(course), simulated };
}
/** minimum % needed on the target category to reach a letter grade */
export function neededFor(course: Course, letter: string): { target: Category | null; needed: number | null } {
  const ungraded = course.categories
    .filter((c) => categoryAvg(course, c.id) == null)
    .sort((a, b) => b.weight - a.weight);
  const target = ungraded[0] ?? null;
  if (!target) return { target: null, needed: null };
  const { earned, gradedWeight } = courseEarned(course);
  const total = gradedWeight + target.weight;
  const needed = ((LETTER_MIN[letter] / 100) * total - earned) / (target.weight / 100) / 1; // pct of category
  return { target, needed };
}

/* ————————————————— seed data ————————————————— */
const cat = (name: string, weight: number): Category => ({ id: uid(), name, weight });
const item = (categoryId: string, name: string, score: number, max: number, off: number): GradeItem => ({
  id: uid(),
  categoryId,
  name,
  score,
  max,
  date: dayISO(off),
});

function seedCourses(): Course[] {
  const m = [cat("Exams", 40), cat("Homework", 20), cat("Quizzes", 15), cat("Final Exam", 25)];
  const cs = [cat("Labs", 30), cat("Projects", 35), cat("Midterm", 15), cat("Final Exam", 20)];
  const ch = [cat("Exams", 45), cat("Labs", 25), cat("Homework", 10), cat("Final Exam", 20)];
  const h = [cat("Essays", 40), cat("Participation", 15), cat("Midterm", 20), cat("Final Exam", 25)];
  const st = [cat("Homework", 30), cat("Quizzes", 20), cat("Midterm", 25), cat("Final Exam", 25)];
  return [
    {
      id: "c1", code: "MATH 241", name: "Calculus II", color: "#63b3f2", credits: 4, professor: "Dr. Okafor",
      categories: m,
      items: [
        item(m[0].id, "Exam 1 · Techniques", 86, 100, -34),
        item(m[0].id, "Exam 2 · Series", 91, 100, -11),
        item(m[1].id, "Problem Set 1–3", 18, 20, -30),
        item(m[1].id, "Problem Set 4–5", 17, 20, -16),
        item(m[2].id, "Quiz 1", 17, 20, -24),
        item(m[2].id, "Quiz 2", 18, 20, -8),
      ],
    },
    {
      id: "c2", code: "CS 260", name: "Data Structures", color: "#3fd9ae", credits: 3, professor: "Dr. Reyes",
      categories: cs,
      items: [
        item(cs[0].id, "Lab 1 · LinkedLists", 29, 30, -28),
        item(cs[0].id, "Lab 2 · Stacks", 30, 30, -14),
        item(cs[1].id, "Project 1 · Maze Solver", 88, 100, -9),
        item(cs[2].id, "Midterm", 84, 100, -6),
      ],
    },
    {
      id: "c3", code: "CHEM 112", name: "Organic Chemistry", color: "#f2b54b", credits: 4, professor: "Prof. Lindqvist",
      categories: ch,
      items: [
        item(ch[0].id, "Exam 1 · Structure", 78, 100, -21),
        item(ch[1].id, "Lab 1 · Distillation", 22, 25, -26),
        item(ch[1].id, "Lab 2 · Synthesis", 24, 25, -12),
        item(ch[2].id, "Worksheet set 1", 9, 10, -18),
      ],
    },
    {
      id: "c4", code: "HIST 105", name: "World History", color: "#f2726b", credits: 3, professor: "Dr. Mbeki",
      categories: h,
      items: [
        item(h[0].id, "Essay 1 · Trade Routes", 92, 100, -19),
        item(h[1].id, "Participation", 14, 15, -5),
      ],
    },
    {
      id: "c5", code: "STAT 200", name: "Statistics", color: "#f28b4b", credits: 3, professor: "Dr. Han",
      categories: st,
      items: [
        item(st[0].id, "HW 1 · Distributions", 27, 30, -23),
        item(st[0].id, "HW 2 · Inference", 29, 30, -10),
        item(st[1].id, "Quiz 1", 16, 20, -13),
      ],
    },
  ];
}

function seedTasks(): Task[] {
  const t = (title: string, courseId: string | null, off: number, priority: Priority, done = false): Task => ({
    id: uid(), title, courseId, due: dayISO(off), priority, done, createdAt: Date.now() - Math.random() * 5e8,
  });
  return [
    t("Problem Set 6 · Improper integrals", "c1", -1, 2),
    t("Pre-lab writeup · Extraction", "c3", 0, 2),
    t("Project 2 checkpoint · AVL tree", "c2", 0, 2),
    t("Essay 2 outline · Silk Roads", "c4", 1, 1),
    t("Quiz 3 study · Taylor series", "c1", 2, 1),
    t("Lab 3 report · Recrystallization", "c3", 3, 2),
    t("HW 3 · Confidence intervals", "c5", 4, 0),
    t("Midterm review sheet", "c2", 6, 1),
    t("Book review first draft", "c4", 9, 0),
    t("Reaction flashcards · Sn1/Sn2", "c3", -1, 1, true),
    t("Syllabus quiz", "c5", -6, 0, true),
  ];
}

const seedState = (): State => ({
  version: 1,
  courses: seedCourses(),
  tasks: seedTasks(),
  settings: {
    theme: (document.documentElement.dataset.theme === "light" ? "light" : "dark") as "dark" | "light",
    passcode: null,
    setupDone: false,
    biometric: true,
    autoLock: true,
    notifications: true,
    remindHours: 24,
    offline: false,
  },
  lastSync: Date.now() - 1000 * 60 * 42,
  pending: 0,
});

/* ————————————————— persistence ————————————————— */
const KEY = "igraded:v1";
function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (s && s.version === 1 && Array.isArray(s.courses) && Array.isArray(s.tasks)) return s;
    }
  } catch {
    /* corrupted → reseed */
  }
  return seedState();
}

/* ————————————————— store context ————————————————— */
type Store = {
  state: State;
  toasts: Toast[];
  toast: (msg: string, kind?: ToastKind, action?: Toast["action"]) => void;
  dismissToast: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "createdAt" | "done">) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  moveTaskTo: (fromId: string, toId: string) => void;
  reorderTasks: (orderedIds: string[]) => void;
  addCourse: (c: Omit<Course, "id" | "items">) => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  addGradeItem: (courseId: string, g: Omit<GradeItem, "id">) => void;
  deleteGradeItem: (courseId: string, itemId: string) => void;
  patchSettings: (p: Partial<Settings>) => void;
  wipeAll: () => void;
  syncNow: () => void;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("store missing");
  return s;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const syncing = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (msg: string, kind: ToastKind = "ok", action?: Toast["action"]) => {
      const id = uid();
      setToasts((t) => [...t.slice(-2), { id, msg, kind, action }]);
      window.setTimeout(() => dismissToast(id), action ? 5200 : 3000);
    },
    [dismissToast],
  );

  /** flush pending ops when back online */
  useEffect(() => {
    if (!state.settings.offline && state.pending > 0 && !syncing.current) {
      syncing.current = true;
      const n = state.pending;
      const t = window.setTimeout(() => {
        setState((s) => ({ ...s, pending: 0, lastSync: Date.now() }));
        syncing.current = false;
        toast(`Synced ${n} change${n > 1 ? "s" : ""} to cloud`, "ok");
      }, 1100);
      return () => window.clearTimeout(t);
    }
  }, [state.settings.offline, state.pending, toast]);

  const bump = useCallback((fn: (s: State) => State) => {
    setState((s) => fn({ ...s, pending: s.settings.offline ? s.pending + 1 : s.pending }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      state,
      toasts,
      toast,
      dismissToast,
      addTask: (t) =>
        bump((s) => ({ ...s, tasks: [{ ...t, id: uid(), createdAt: Date.now(), done: false }, ...s.tasks] })),
      toggleTask: (id) =>
        bump((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
      deleteTask: (id) => {
        const idx = state.tasks.findIndex((t) => t.id === id);
        const task = state.tasks[idx];
        if (!task) return;
        bump((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
        toast(`Deleted “${task.title.length > 26 ? task.title.slice(0, 26) + "…" : task.title}”`, "warn", {
          label: "Undo",
          fn: () =>
            bump((s) => {
              const tasks = [...s.tasks];
              tasks.splice(Math.min(idx, tasks.length), 0, task);
              return { ...s, tasks };
            }),
        });
      },
      reorderTasks: (ids) =>
        bump((s) => ({
          ...s,
          tasks: [...s.tasks].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)),
        })),
      moveTaskTo: (fromId, toId) =>
        bump((s) => {
          const from = s.tasks.findIndex((t) => t.id === fromId);
          const to = s.tasks.findIndex((t) => t.id === toId);
          if (from < 0 || to < 0 || from === to) return s;
          const tasks = [...s.tasks];
          const [m] = tasks.splice(from, 1);
          tasks.splice(to, 0, m);
          return { ...s, tasks };
        }),
      addCourse: (c) => bump((s) => ({ ...s, courses: [...s.courses, { ...c, id: uid(), items: [] }] })),
      updateCourse: (id, patch) =>
        bump((s) => ({ ...s, courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch, id: c.id } : c)) })),
      deleteCourse: (id) =>
        bump((s) => ({
          ...s,
          courses: s.courses.filter((c) => c.id !== id),
          tasks: s.tasks.map((t) => (t.courseId === id ? { ...t, courseId: null } : t)),
        })),
      addGradeItem: (courseId, g) =>
        bump((s) => ({
          ...s,
          courses: s.courses.map((c) => (c.id === courseId ? { ...c, items: [...c.items, { ...g, id: uid() }] } : c)),
        })),
      deleteGradeItem: (courseId, itemId) =>
        bump((s) => ({
          ...s,
          courses: s.courses.map((c) =>
            c.id === courseId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c,
          ),
        })),
      patchSettings: (p) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } })),
      wipeAll: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* noop */
        }
        setState(seedState());
      },
      syncNow: () => {
        if (state.settings.offline) {
          toast("Offline — changes will sync when reconnected", "warn");
          return;
        }
        if (state.pending === 0) {
          toast("Already up to date", "ok");
          setState((s) => ({ ...s, lastSync: Date.now() }));
          return;
        }
        const n = state.pending;
        toast(`Syncing ${n} change${n > 1 ? "s" : ""}…`, "ok");
        window.setTimeout(() => {
          setState((s) => ({ ...s, pending: 0, lastSync: Date.now() }));
          toast("All changes synced to cloud", "ok");
        }, 900);
      },
    }),
    [state, toasts, toast, dismissToast, bump],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ————————————————— shared derived helpers ————————————————— */
export function dueInfo(due: string, done: boolean) {
  const d = parseISO(due);
  const diff = differenceInCalendarDays(d, new Date());
  if (done) return { label: format(d, "MMM d"), tone: "muted" as const };
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, tone: "danger" as const };
  if (diff === 0) return { label: "Today", tone: "danger" as const };
  if (diff === 1) return { label: "Tomorrow", tone: "warn" as const };
  if (diff < 7) return { label: format(d, "EEEE"), tone: "ok" as const };
  return { label: format(d, "MMM d"), tone: "muted" as const };
}

/* ————————————————— exports (Privacy Dashboard) ————————————————— */
function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function exportGradesCSV(state: State) {
  const rows: (string | number)[][] = [["Course", "Code", "Category", "Weight %", "Item", "Score", "Max", "Percent", "Date"]];
  for (const c of state.courses)
    for (const cat of c.categories)
      for (const i of c.items.filter((x) => x.categoryId === cat.id))
        rows.push([c.name, c.code, cat.name, cat.weight, i.name, i.score, i.max, ((i.score / i.max) * 100).toFixed(1), i.date]);
  download(`igraded-grades-${todayISO()}.csv`, rows.map((r) => r.map(esc).join(",")).join("\n"), "text/csv");
}
export function exportTasksCSV(state: State) {
  const rows: (string | number)[][] = [["Title", "Course", "Due", "Priority", "Completed"]];
  for (const t of state.tasks)
    rows.push([t.title, state.courses.find((c) => c.id === t.courseId)?.code ?? "—", t.due, ["Low", "Medium", "High"][t.priority], t.done ? "Yes" : "No"]);
  download(`igraded-tasks-${todayISO()}.csv`, rows.map((r) => r.map(esc).join(",")).join("\n"), "text/csv");
}
export function exportBackupJSON(state: State) {
  download(`igraded-backup-${todayISO()}.json`, JSON.stringify(state, null, 2), "application/json");
}
