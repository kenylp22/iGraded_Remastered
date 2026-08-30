import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarPlus, ChevronRight, Cloud, CloudOff, ListPlus, SlidersHorizontal, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { coursePct, dueInfo, gradeColor, gpa, overallPct, useStore, type Task } from "../lib/store";
import { DueChip, LetterChip, Ring, SectionHead } from "../components/ui";

const hour = () => new Date().getHours();
const greeting = () => (hour() < 5 ? "Late night" : hour() < 12 ? "Good morning" : hour() < 18 ? "Good afternoon" : "Good evening");

function SyncPill({ onTap }: { onTap: () => void }) {
  const { state } = useStore();
  const offline = state.settings.offline;
  return (
    <button
      onClick={onTap}
      className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[10.5px] font-bold transition hover:border-[var(--line-strong)]"
      style={{ color: offline ? "var(--amber)" : "var(--primary)" }}
    >
      {offline ? <CloudOff size={12} /> : <Cloud size={12} />}
      {offline ? `Offline · ${state.pending} queued` : "Synced"}
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: offline ? "var(--amber)" : "var(--primary)", animation: "pulse-dot 2.2s infinite" }}
      />
    </button>
  );
}

export default function Dashboard({
  goTasks,
  goGrades,
  onMenu,
  onQuick,
  goSettings,
}: {
  goTasks: () => void;
  goGrades: () => void;
  onMenu: () => void;
  onQuick: (k: "task" | "grade" | "whatif") => void;
  goSettings: () => void;
}) {
  const { state } = useStore();
  const g = gpa(state.courses);
  const avg = overallPct(state.courses);
  const credits = state.courses.reduce((s, c) => s + c.credits, 0);

  const upcoming = useMemo(() => {
    return [...state.tasks]
      .filter((t) => !t.done)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 4);
  }, [state.tasks]);

  const overdue = state.tasks.filter((t) => !t.done && dueInfo(t.due, false).tone === "danger").length;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-3 px-5 pb-4 pt-2">
        <button
          onClick={onMenu}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition hover:border-[var(--line-strong)]"
          aria-label="Open courses drawer"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path d="M1 1h16M1 7h11M1 13h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[var(--muted)]">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="font-display truncate text-[17px] font-bold leading-tight">{greeting()}, Maya</h1>
        </div>
        <SyncPill onTap={goSettings} />
        <div className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0e5e4c] to-[#0a3d33] text-xs font-bold text-[#3fd9ae]">
          MC
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        {/* GPA hero */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-raised relative overflow-hidden p-5"
        >
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-[var(--primary)] opacity-[0.08] blur-2xl" />
          <div className="flex items-center gap-5">
            <Ring size={118} stroke={10} value={(g ?? 0) / 4} color="var(--primary)">
              <span className="font-display tnum text-[26px] font-extrabold leading-none">{g == null ? "–" : g.toFixed(2)}</span>
              <span className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--muted)]">GPA / 4.0</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Semester standing</p>
              <p className="font-display tnum mt-1 text-2xl font-extrabold" style={{ color: gradeColor(avg) }}>
                {avg == null ? "—" : `${avg.toFixed(1)}%`}
              </p>
              <p className="text-xs font-semibold text-[var(--muted)]">
                weighted average · {credits} credits
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[10px] font-bold text-[var(--faint)]">
                  <span>Week 6 of 16</span>
                  <span>38%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
                  <div className="bar-grow h-full w-[38%] rounded-full bg-[var(--amber)]" />
                </div>
              </div>
            </div>
          </div>
          {overdue > 0 && (
            <button
              onClick={goTasks}
              className="mt-4 flex w-full items-center gap-2 rounded-xl bg-[var(--coral-soft)] px-3 py-2.5 text-left text-xs font-bold text-[var(--coral)] transition hover:brightness-110"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)]" style={{ animation: "pulse-dot 1.6s infinite" }} />
              {overdue} assignment{overdue > 1 ? "s" : ""} need attention — open tasks
              <ArrowRight size={13} className="ml-auto shrink-0" />
            </button>
          )}
        </motion.section>

        {/* quick actions */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {(
            [
              { icon: <ListPlus size={17} />, label: "New task", k: "task" as const, tint: "var(--primary)" },
              { icon: <CalendarPlus size={17} />, label: "Log grade", k: "grade" as const, tint: "var(--sky)" },
              { icon: <SlidersHorizontal size={17} />, label: "What-if", k: "whatif" as const, tint: "var(--amber)" },
            ]
          ).map((a, i) => (
            <motion.button
              key={a.k}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onQuick(a.k)}
              className="card flex flex-col items-center gap-1.5 py-3.5 transition hover:border-[var(--line-strong)]"
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${a.tint} 15%, transparent)`, color: a.tint }}
              >
                {a.icon}
              </span>
              <span className="text-[11px] font-bold">{a.label}</span>
            </motion.button>
          ))}
        </div>

        {/* next up */}
        <div className="mt-6">
          <SectionHead
            title="Next up"
            right={
              <button onClick={goTasks} className="flex items-center text-[11px] font-bold text-[var(--primary)]">
                All tasks <ChevronRight size={13} />
              </button>
            }
          />
          <div className="card divide-y divide-[var(--line)] overflow-hidden">
            {upcoming.map((t: Task) => {
              const course = state.courses.find((c) => c.id === t.courseId);
              return (
                <button key={t.id} onClick={goTasks} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--bg-soft)]">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: course?.color ?? "var(--faint)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{t.title}</span>
                    <span className="text-[10.5px] font-semibold text-[var(--faint)]">{course?.code ?? "General"}</span>
                  </span>
                  <DueChip due={t.due} done={false} />
                </button>
              );
            })}
            {upcoming.length === 0 && <p className="px-4 py-6 text-center text-xs text-[var(--muted)]">All clear — nothing due this week.</p>}
          </div>
        </div>

        {/* courses rail */}
        <div className="mt-6">
          <SectionHead
            title="Your courses"
            right={
              <button onClick={goGrades} className="flex items-center text-[11px] font-bold text-[var(--primary)]">
                Grades <ChevronRight size={13} />
              </button>
            }
          />
        </div>

        {/* courses rail — edge-to-edge inside scroller */}
        <div className="no-scrollbar -mx-5 mt-1 flex snap-x gap-3 overflow-x-auto px-5 pb-2 pt-1">
          {state.courses.map((c, i) => {
            const pct = coursePct(c);
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={goGrades}
                className="card relative w-[150px] shrink-0 snap-start overflow-hidden p-3.5 text-left transition hover:border-[var(--line-strong)]"
              >
                <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: c.color }} />
                <div className="flex items-start justify-between">
                  <span className="font-display text-[11px] font-bold" style={{ color: c.color }}>
                    {c.code}
                  </span>
                  <LetterChip pct={pct} />
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-[var(--muted)]">{c.name}</p>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <Ring size={38} stroke={4} value={(pct ?? 0) / 100} color={c.color}>
                    <span className="tnum text-[9px] font-bold">{pct == null ? "–" : Math.round(pct)}</span>
                  </Ring>
                  <span className="text-[10px] font-semibold leading-tight text-[var(--faint)]">
                    {c.credits} credits<br />
                    {c.items.length} graded
                  </span>
                </div>
              </motion.button>
            );
          })}
          <button
            onClick={goGrades}
            className="grid w-[76px] shrink-0 snap-start place-items-center rounded-[1.25rem] border border-dashed border-[var(--line-strong)] text-[var(--faint)] transition hover:text-[var(--primary)]"
            aria-label="Open simulator"
          >
            <Sparkles size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

