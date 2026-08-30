import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronRight, Minus, Plus, X } from "lucide-react";
import { coursePct, gpa, haptic, uid, useStore, type Course } from "../lib/store";
import { HoldButton, LetterChip, Sheet } from "../components/ui";

const SWATCHES = ["#3fd9ae", "#63b3f2", "#f2b54b", "#f2726b", "#f28b4b", "#b48cf2", "#5fd4d0", "#e88ab8"];

type DraftCat = { id: string; name: string; weight: number };
type Draft = {
  id: string | null;
  code: string;
  name: string;
  professor: string;
  credits: number;
  color: string;
  categories: DraftCat[];
};

const blankDraft = (): Draft => ({
  id: null,
  code: "",
  name: "",
  professor: "",
  credits: 3,
  color: SWATCHES[0],
  categories: [
    { id: uid(), name: "Exams", weight: 40 },
    { id: uid(), name: "Homework", weight: 30 },
    { id: uid(), name: "Final Exam", weight: 30 },
  ],
});

function CourseEditor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { addCourse, updateCourse, deleteCourse, toast } = useStore();
  const [d, setD] = useState<Draft>(draft);
  useEffect(() => setD(draft), [draft]);

  const total = d.categories.reduce((s, c) => s + c.weight, 0);
  const valid = d.code.trim() && d.name.trim() && d.categories.length > 0 && total === 100 && d.categories.every((c) => c.name.trim());

  const save = () => {
    if (!valid) {
      haptic(30);
      toast(total !== 100 ? `Weights must total 100% (currently ${total}%)` : "Fill in code, name and categories", "warn");
      return;
    }
    const payload = {
      code: d.code.trim().toUpperCase(),
      name: d.name.trim(),
      professor: d.professor.trim() || "—",
      credits: d.credits,
      color: d.color,
      categories: d.categories.map((c) => ({ id: c.id, name: c.name.trim(), weight: c.weight })),
    };
    if (d.id) {
      updateCourse(d.id, payload);
      toast("Course updated", "ok");
    } else {
      addCourse(payload);
      toast(`${payload.code} added to your term`, "ok");
    }
    haptic(18);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={d.id ? "Edit course" : "New course"}>
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Code</p>
          <input className="input" placeholder="MATH 241" value={d.code} onChange={(e) => setD({ ...d, code: e.target.value })} />
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Course name</p>
          <input className="input" placeholder="Calculus II" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Instructor</p>
        <input className="input" placeholder="Dr. Okafor" value={d.professor} onChange={(e) => setD({ ...d, professor: e.target.value })} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Credits</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setD({ ...d, credits: Math.max(1, d.credits - 1) })}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--bg-soft)]"
              aria-label="Fewer credits"
            >
              <Minus size={15} />
            </button>
            <span className="font-display tnum w-8 text-center text-lg font-extrabold">{d.credits}</span>
            <button
              onClick={() => setD({ ...d, credits: Math.min(6, d.credits + 1) })}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--bg-soft)]"
              aria-label="More credits"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
        <div className="flex-1">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Color</p>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  haptic(6);
                  setD({ ...d, color: c });
                }}
                className="h-8 w-8 rounded-full transition"
                style={{
                  background: c,
                  outline: d.color === c ? `2.5px solid ${c}` : "none",
                  outlineOffset: 2.5,
                  transform: d.color === c ? "scale(1.05)" : "scale(1)",
                }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* categories */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Grade categories</p>
          <span
            className="tnum rounded-md px-2 py-0.5 text-[10.5px] font-extrabold"
            style={{
              color: total === 100 ? "var(--primary)" : "var(--coral)",
              background: total === 100 ? "var(--primary-soft)" : "var(--coral-soft)",
            }}
          >
            {total}% / 100%
          </span>
        </div>
        {d.categories.map((c) => (
          <div key={c.id} className="mb-2 flex items-center gap-2">
            <input
              className="input py-2.5! text-[13px]"
              placeholder="Category"
              value={c.name}
              onChange={(e) =>
                setD({ ...d, categories: d.categories.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })
              }
            />
            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] p-1">
              <button
                onClick={() =>
                  setD({ ...d, categories: d.categories.map((x) => (x.id === c.id ? { ...x, weight: Math.max(0, x.weight - 5) } : x)) })
                }
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)]"
                aria-label="Decrease weight"
              >
                <Minus size={13} />
              </button>
              <span className="tnum w-10 text-center text-xs font-extrabold">{c.weight}%</span>
              <button
                onClick={() =>
                  setD({ ...d, categories: d.categories.map((x) => (x.id === c.id ? { ...x, weight: Math.min(100, x.weight + 5) } : x)) })
                }
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)]"
                aria-label="Increase weight"
              >
                <Plus size={13} />
              </button>
            </div>
            <button
              onClick={() => setD({ ...d, categories: d.categories.filter((x) => x.id !== c.id) })}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--faint)] transition hover:bg-[var(--coral-soft)] hover:text-[var(--coral)]"
              aria-label="Remove category"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setD({ ...d, categories: [...d.categories, { id: uid(), name: "", weight: Math.max(0, 100 - total) }] })}
          className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
        >
          <Plus size={13} /> Add category
        </button>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={save}
        className="font-display mt-5 w-full rounded-2xl py-3.5 text-sm font-bold"
        style={{
          background: valid ? "var(--primary)" : "var(--line-strong)",
          color: valid ? "var(--ink)" : "var(--faint)",
        }}
      >
        {d.id ? "Save changes" : "Create course"}
      </motion.button>

      {d.id && (
        <div className="mt-3">
          <HoldButton
            label="Hold to delete course"
            onConfirm={() => {
              deleteCourse(d.id!);
              toast("Course deleted — its tasks are now General", "warn");
              onClose();
            }}
          />
        </div>
      )}
    </Sheet>
  );
}

export default function CoursesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const [editor, setEditor] = useState<Draft | null>(null);
  const g = gpa(state.courses);

  const rows = useMemo(
    () =>
      state.courses.map((c) => ({ c, pct: coursePct(c) })),
    [state.courses],
  );

  const toDraft = (c: Course): Draft => ({
    id: c.id,
    code: c.code,
    name: c.name,
    professor: c.professor,
    credits: c.credits,
    color: c.color,
    categories: c.categories.map((x) => ({ ...x })),
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-40 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute bottom-0 left-0 top-0 z-50 flex w-[82%] flex-col border-r border-[var(--line)] bg-[var(--bg-soft)]"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-6">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Spring 2026</p>
                <h2 className="font-display text-lg font-extrabold">My Courses</h2>
              </div>
              <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface)] text-[var(--muted)]" aria-label="Close drawer">
                <X size={17} />
              </button>
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-4">
              {rows.map(({ c, pct }, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                  onClick={() => setEditor(toDraft(c))}
                  className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--line-strong)]"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: c.color }}>
                    <BookOpen size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display block text-[11px] font-bold" style={{ color: c.color }}>{c.code}</span>
                    <span className="block truncate text-[13px] font-bold">{c.name}</span>
                    <span className="tnum text-[10.5px] font-semibold text-[var(--faint)]">{c.credits} cr · {c.items.length} graded · {c.categories.length} categories</span>
                  </span>
                  <LetterChip pct={pct} />
                  <ChevronRight size={15} className="text-[var(--faint)]" />
                </motion.button>
              ))}

              <motion.button
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + rows.length * 0.04 }}
                onClick={() => setEditor(blankDraft())}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line-strong)] py-4 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <Plus size={15} /> Add a course
              </motion.button>
            </div>

            <div className="border-t border-[var(--line)] bg-[var(--surface)] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Term GPA</p>
                  <p className="font-display tnum text-xl font-extrabold text-[var(--primary)]">{g == null ? "–" : g.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Load</p>
                  <p className="font-display tnum text-xl font-extrabold">{state.courses.reduce((s, c) => s + c.credits, 0)} cr</p>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
