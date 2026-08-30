import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, ClipboardList, Inbox, Plus, Trash2 } from "lucide-react";
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { haptic, todayISO, useStore, type Priority, type Task } from "../lib/store";
import { DragHandle, DueChip, EmptyState, PriorityFlag, Seg, Sheet } from "../components/ui";

type Filter = "all" | "today" | "upcoming" | "overdue" | "done";

/* ————— swipeable + draggable task row ————— */
function TaskRow({
  task,
  draggable,
  showCourse = true,
}: {
  task: Task;
  draggable?: boolean;
  showCourse?: boolean;
}) {
  const { state, toggleTask, deleteTask } = useStore();
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false);
  const start = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const controls = useDragControls();
  const course = state.courses.find((c) => c.id === task.courseId);

  const onDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, active: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setSettling(false);
  };
  const onMove = (e: React.PointerEvent) => {
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (!start.current.active) {
      if (Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(ddy) * 1.2) start.current.active = true;
      else return;
    }
    setDx(Math.max(-104, Math.min(104, ddx)));
  };
  const onUp = () => {
    if (!start.current.active) {
      setSettling(true);
      setDx(0);
      return;
    }
    if (dx > 64) {
      haptic(16);
      toggleTask(task.id);
    } else if (dx < -64) {
      haptic(22);
      deleteTask(task.id);
    }
    setSettling(true);
    setDx(0);
  };

  return (
    <Reorder.Item
      value={task.id}
      as="div"
      dragListener={false}
      dragControls={draggable ? controls : undefined}
      className="relative mb-2 select-none"
      style={{ touchAction: "pan-y" }}
    >
      {/* swipe backgrounds */}
      <div
        className="absolute inset-0 flex items-center justify-between rounded-2xl px-5 transition-opacity"
        style={{
          background: dx >= 0 ? "var(--primary-soft)" : "var(--coral-soft)",
          opacity: Math.min(1, Math.abs(dx) / 70),
        }}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--primary)]">
          <Check size={16} /> {task.done ? "Reopen" : "Done"}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--coral)]">
          Delete <Trash2 size={15} />
        </span>
      </div>

      <div
        className={`relative flex h-[64px] items-center gap-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] pl-2.5 pr-1.5 ${
          settling ? "transition-transform duration-200 ease-out" : ""
        }`}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* checkbox */}
        <motion.button
          whileTap={{ scale: 0.82 }}
          onClick={(e) => {
            e.stopPropagation();
            haptic(14);
            toggleTask(task.id);
          }}
          className="grid h-11 w-11 shrink-0 place-items-center"
          aria-label="Toggle complete"
        >
          <span
            className="grid h-[22px] w-[22px] place-items-center rounded-full border-2 transition-colors"
            style={{
              borderColor: task.done ? "var(--primary)" : "var(--line-strong)",
              background: task.done ? "var(--primary)" : "transparent",
              color: "var(--ink)",
            }}
          >
            <AnimatePresence>
              {task.done && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check size={13} strokeWidth={3.4} />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.button>

        {/* body */}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[13.5px] font-semibold ${task.done ? "text-[var(--faint)] line-through" : ""}`}>
            {task.title}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            {showCourse && course && (
              <span className="flex items-center gap-1 text-[10.5px] font-bold" style={{ color: course.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: course.color }} />
                {course.code}
              </span>
            )}
            <DueChip due={task.due} done={task.done} />
          </div>
        </div>

        <PriorityFlag p={task.priority} />
        {draggable && (
          <span onPointerDown={(e) => controls.start(e)}>
            <DragHandle />
          </span>
        )}
      </div>
    </Reorder.Item>
  );
}

/* ————— quick add sheet ————— */
export function TaskSheet({ open, onClose, presetDate }: { open: boolean; onClose: () => void; presetDate?: string }) {
  const { state, addTask, toast } = useStore();
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [due, setDue] = useState(presetDate ?? todayISO());
  const [priority, setPriority] = useState<Priority>(1);

  useEffect(() => {
    if (open) {
      setTitle("");
      setCourseId(null);
      setDue(presetDate ?? todayISO());
      setPriority(1);
    }
  }, [open, presetDate]);

  const save = () => {
    if (!title.trim()) {
      haptic(30);
      toast("Give the task a title first", "warn");
      return;
    }
    addTask({ title: title.trim(), courseId, due, priority });
    haptic(18);
    toast("Task added", "ok");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="New task">
      <input
        className="input font-display text-base font-semibold"
        placeholder="e.g. Problem Set 7 · Fourier"
        value={title}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <p className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Course</p>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          onClick={() => setCourseId(null)}
          className={`chip py-2! ${courseId === null ? "chip-active" : ""}`}
        >
          General
        </button>
        {state.courses.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              haptic(6);
              setCourseId(c.id);
            }}
            className={`chip py-2! ${courseId === c.id ? "chip-active" : ""}`}
            style={courseId === c.id ? {} : { color: c.color, borderColor: `color-mix(in srgb, ${c.color} 40%, transparent)` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: courseId === c.id ? "var(--ink)" : c.color }} />
            {c.code}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Due date</p>
          <input type="date" className="input tnum" value={due} onChange={(e) => e.target.value && setDue(e.target.value)} />
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Priority</p>
          <Seg
            size="sm"
            options={[
              { value: "0", label: "Low" },
              { value: "1", label: "Med" },
              { value: "2", label: "High" },
            ]}
            value={String(priority) as "0" | "1" | "2"}
            onChange={(v) => setPriority(Number(v) as Priority)}
          />
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={save}
        className="font-display mt-5 w-full rounded-2xl bg-[var(--primary)] py-3.5 text-sm font-bold text-[var(--ink)] shadow-[0_10px_24px_-10px_var(--primary)]"
      >
        Add task
      </motion.button>
    </Sheet>
  );
}

/* ————— calendar month view ————— */
function CalendarView({ onAdd }: { onAdd: (date: string) => void }) {
  const { state, toggleTask } = useStore();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => todayISO());

  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of state.tasks) {
      const arr = m.get(t.due) ?? [];
      arr.push(t);
      m.set(t.due, arr);
    }
    return m;
  }, [state.tasks]);

  const gridStart = startOfWeek(startOfMonth(month));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const dayTasks = byDay.get(selected) ?? [];

  return (
    <div>
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setMonth((m) => addDays(startOfMonth(m), -1))} className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--bg-soft)] text-[var(--muted)] transition hover:text-[var(--text)]" aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="font-display text-sm font-bold">{format(month, "MMMM yyyy")}</p>
            <button onClick={() => { setMonth(startOfMonth(new Date())); setSelected(todayISO()); }} className="text-[10.5px] font-bold text-[var(--primary)]">
              Jump to today
            </button>
          </div>
          <button onClick={() => setMonth((m) => endOfMonth(addDays(endOfMonth(m), 1)))} className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--bg-soft)] text-[var(--muted)] transition hover:text-[var(--text)]" aria-label="Next month">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold uppercase text-[var(--faint)]">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i} className="py-1">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d) => {
            const iso = format(d, "yyyy-MM-dd");
            const tasks = byDay.get(iso) ?? [];
            const sel = iso === selected;
            return (
              <button
                key={iso}
                onClick={() => {
                  haptic(6);
                  setSelected(iso);
                }}
                className="relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-2xl transition"
                style={{
                  background: sel ? "var(--primary)" : isToday(d) ? "var(--primary-soft)" : "transparent",
                  color: sel ? "var(--ink)" : isSameMonth(d, month) ? "var(--text)" : "var(--faint)",
                }}
              >
                <span className="tnum text-[12.5px] font-bold leading-none">{format(d, "d")}</span>
                <span className="mt-1 flex gap-[3px]">
                  {tasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className="h-[4px] w-[4px] rounded-full"
                      style={{
                        background: sel
                          ? "var(--ink)"
                          : t.done
                            ? "var(--faint)"
                            : state.courses.find((c) => c.id === t.courseId)?.color ?? "var(--primary)",
                      }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* selected day */}
      <div className="mt-4 flex items-center justify-between px-1">
        <div>
          <p className="font-display text-sm font-bold">{format(parseISO(selected), isToday(parseISO(selected)) ? "'Today ·' MMM d" : "EEEE, MMM d")}</p>
          <p className="text-[11px] font-semibold text-[var(--muted)]">{dayTasks.length ? `${dayTasks.filter((t) => !t.done).length} open` : "No deadlines"}</p>
        </div>
        <button
          onClick={() => onAdd(selected)}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-[var(--primary-soft)] px-3.5 text-xs font-bold text-[var(--primary)] transition hover:brightness-110"
        >
          <Plus size={15} /> Add here
        </button>
      </div>
      <div className="mt-2.5">
        {dayTasks.length === 0 ? (
          <div className="card py-6 text-center">
            <p className="text-xs font-semibold text-[var(--muted)]">Clear day — nothing scheduled.</p>
          </div>
        ) : (
          dayTasks.map((t) => {
            const course = state.courses.find((c) => c.id === t.courseId);
            return (
              <div key={t.id} className="mb-2 flex h-[56px] items-center gap-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] pl-2 pr-3.5">
                <motion.button
                  whileTap={{ scale: 0.82 }}
                  onClick={() => {
                    haptic(14);
                    toggleTask(t.id);
                  }}
                  className="grid h-11 w-11 shrink-0 place-items-center"
                  aria-label="Toggle complete"
                >
                  <span
                    className="grid h-[22px] w-[22px] place-items-center rounded-full border-2"
                    style={{
                      borderColor: t.done ? "var(--primary)" : "var(--line-strong)",
                      background: t.done ? "var(--primary)" : "transparent",
                      color: "var(--ink)",
                    }}
                  >
                    {t.done && <Check size={13} strokeWidth={3.4} />}
                  </span>
                </motion.button>
                <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: course?.color ?? "var(--faint)" }} />
                <p className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${t.done ? "text-[var(--faint)] line-through" : ""}`}>{t.title}</p>
                <DueChip due={t.due} done={t.done} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ————— main screen ————— */
export default function TasksScreen({ intent, onIntentHandled }: { intent: { kind: string; ts: number } | null; onIntentHandled: () => void }) {
  const { state, reorderTasks, toast } = useStore();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [sheet, setSheet] = useState<{ open: boolean; date?: string }>({ open: false });

  useEffect(() => {
    if (intent?.kind === "task") {
      setView("list");
      setSheet({ open: true });
      onIntentHandled();
    }
  }, [intent, onIntentHandled]);

  const filters: { key: Filter; label: string; count: number }[] = useMemo(() => {
    const open = state.tasks.filter((t) => !t.done);
    const diff = (t: Task) => differenceInCalendarDays(parseISO(t.due), new Date());
    return [
      { key: "all", label: "All", count: open.length },
      { key: "today", label: "Today", count: open.filter((t) => diff(t) === 0).length },
      { key: "upcoming", label: "Upcoming", count: open.filter((t) => diff(t) > 0).length },
      { key: "overdue", label: "Overdue", count: open.filter((t) => diff(t) < 0).length },
      { key: "done", label: "Done", count: state.tasks.filter((t) => t.done).length },
    ];
  }, [state.tasks]);

  const visible = useMemo(() => {
    const diff = (t: Task) => differenceInCalendarDays(parseISO(t.due), new Date());
    const list = state.tasks.filter((t) => {
      if (filter === "all") return !t.done;
      if (filter === "done") return t.done;
      if (filter === "today") return !t.done && diff(t) === 0;
      if (filter === "upcoming") return !t.done && diff(t) > 0;
      return !t.done && diff(t) < 0;
    });
    if (filter === "all") return list; // manual order
    return [...list].sort((a, b) => a.due.localeCompare(b.due));
  }, [state.tasks, filter]);

  const canReorder = view === "list" && filter === "all";

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-3 pt-2">
        <div>
          <h1 className="font-display text-xl font-extrabold">Tasks</h1>
          <p className="text-[11px] font-semibold text-[var(--muted)]">
            {state.tasks.filter((t) => !t.done).length} open · swipe to clear, drag to rank
          </p>
        </div>
        <div className="w-[168px]">
          <Seg
            size="sm"
            options={[
              { value: "list", label: "List" },
              { value: "calendar", label: "Calendar" },
            ]}
            value={view}
            onChange={(v) => setView(v)}
          />
        </div>
      </div>

      {view === "list" && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-3">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                haptic(6);
                setFilter(f.key);
              }}
              className={`chip px-3! py-2! ${filter === f.key ? "chip-active" : ""}`}
            >
              {f.label}
              <span className={`tnum rounded-full px-1.5 text-[10px] ${filter === f.key ? "bg-[var(--ink)]/15" : "bg-[var(--bg-soft)]"}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-24 pt-1">
        {view === "calendar" ? (
          <CalendarView onAdd={(date) => setSheet({ open: true, date })} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={filter === "done" ? <ClipboardList size={22} /> : <Inbox size={22} />}
            title={filter === "done" ? "Nothing completed yet" : "Inbox zero"}
            sub={
              filter === "done"
                ? "Tasks you complete will collect here."
                : filter === "overdue"
                  ? "No overdue work. Keep it that way."
                  : "Tap the + button to plan your next deadline."
            }
          />
        ) : canReorder ? (
          <Reorder.Group
            axis="y"
            values={visible.map((t) => t.id)}
            onReorder={(ids) => reorderTasks(ids as string[])}
          >
            {visible.map((t) => (
              <TaskRow key={t.id} task={t} draggable />
            ))}
          </Reorder.Group>
        ) : (
          visible.map((t) => <TaskRow key={t.id} task={t} />)
        )}

        {view === "list" && visible.length > 0 && (
          <p className="mt-3 text-center text-[10.5px] font-semibold text-[var(--faint)]">
            {canReorder ? "Drag the grip to reorder · swipe right to complete · swipe left to delete" : "Switch to the All filter to reorder manually"}
          </p>
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => {
          haptic(10);
          setSheet({ open: true });
        }}
        className="absolute bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--primary)] text-[var(--ink)] shadow-[0_14px_28px_-8px_var(--primary)]"
        aria-label="Add task"
      >
        <Plus size={24} strokeWidth={2.6} />
      </motion.button>

      <TaskSheet open={sheet.open} presetDate={sheet.date} onClose={() => setSheet({ open: false })} />
    </div>
  );
}
