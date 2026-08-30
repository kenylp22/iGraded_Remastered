import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  categoryAvg,
  courseEarned,
  coursePct,
  gradeColor,
  gpa,
  haptic,
  letterFor,
  neededFor,
  todayISO,
  useStore,
  whatIf,
  type Course,
} from "../lib/store";
import { LetterChip, Ring, SectionHead, Seg, Sheet, Slider } from "../components/ui";
import { StandingsBars, TrendChart } from "../components/charts";

/* ————— grade entry sheet ————— */
function GradeSheet({ course, open, onClose }: { course: Course | null; open: boolean; onClose: () => void }) {
  const { addGradeItem, toast } = useStore();
  const [catId, setCatId] = useState("");
  const [name, setName] = useState("");
  const [score, setScore] = useState("88");
  const [max, setMax] = useState("100");

  useEffect(() => {
    if (open && course) {
      setCatId(course.categories[0]?.id ?? "");
      setName("");
      setScore("88");
      setMax("100");
    }
  }, [open, course]);

  if (!course) return null;
  const s = Number(score);
  const m = Number(max);
  const pct = m > 0 ? (s / m) * 100 : null;

  const save = () => {
    if (!name.trim()) {
      toast("Name the assignment first", "warn");
      return;
    }
    if (!(m > 0) || Number.isNaN(s) || s < 0 || s > m) {
      haptic(30);
      toast("Score must be between 0 and the max", "warn");
      return;
    }
    addGradeItem(course.id, { categoryId: catId, name: name.trim(), score: s, max: m, date: todayISO() });
    haptic(18);
    toast(`Logged “${name.trim()}” · ${pct?.toFixed(0)}%`, "ok");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Log grade · ${course.code}`}>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Category</p>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {course.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              haptic(6);
              setCatId(c.id);
            }}
            className={`chip py-2! ${catId === c.id ? "chip-active" : ""}`}
          >
            {c.name} · {c.weight}%
          </button>
        ))}
      </div>
      <p className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Assignment</p>
      <input className="input" placeholder="e.g. Exam 2 · Series" value={name} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Score</p>
          <input className="input tnum" type="number" inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Out of</p>
          <input className="input tnum" type="number" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--bg-soft)] px-4 py-3">
        <span className="text-xs font-bold text-[var(--muted)]">Weighted into</span>
        <span className="font-display tnum text-lg font-extrabold" style={{ color: pct == null ? "var(--faint)" : gradeColor(pct) }}>
          {pct == null ? "—" : `${pct.toFixed(1)}% · ${letterFor(pct)}`}
        </span>
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={save}
        className="font-display mt-5 w-full rounded-2xl bg-[var(--primary)] py-3.5 text-sm font-bold text-[var(--ink)]"
      >
        Save grade
      </motion.button>
    </Sheet>
  );
}

/* ————— what-if simulator ————— */
function Simulator({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [assume, setAssume] = useState(85);
  const [target, setTarget] = useState<"A" | "A-" | "B+" | "B">("A-");
  const course = courses.find((c) => c.id === courseId) ?? courses[0];

  useEffect(() => {
    if (!courses.find((c) => c.id === courseId) && courses[0]) setCourseId(courses[0].id);
  }, [courses, courseId]);

  const sim = useMemo(() => (course ? whatIf(course, assume) : null), [course, assume]);
  const need = useMemo(() => (course ? neededFor(course, target) : { target: null, needed: null }), [course, target]);

  if (!course || !sim) return null;
  const delta = sim.simulated != null && sim.current != null ? sim.simulated - sim.current : null;

  return (
    <section className="card-raised overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-3.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--amber-soft)] text-[var(--amber)]">
          <Target size={16} />
        </span>
        <div>
          <h3 className="font-display text-sm font-bold">What-If Simulator</h3>
          <p className="text-[10.5px] font-semibold text-[var(--muted)]">Stress-test your final before it happens</p>
        </div>
      </div>

      <div className="p-4">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                haptic(6);
                setCourseId(c.id);
              }}
              className={`chip py-2! ${courseId === c.id ? "chip-active" : ""}`}
              style={courseId === c.id ? {} : { color: c.color, borderColor: `color-mix(in srgb, ${c.color} 40%, transparent)` }}
            >
              {c.code}
            </button>
          ))}
        </div>

        {sim.target ? (
          <>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-xs font-bold text-[var(--muted)]">
                Assume score on <span style={{ color: course.color }}>{sim.target.name}</span> ({sim.target.weight}% of grade)
              </p>
              <p className="font-display tnum text-2xl font-extrabold" style={{ color: gradeColor(sim.simulated) }}>
                {assume}%
              </p>
            </div>
            <Slider value={assume} onChange={setAssume} color={course.color} />

            <div className="mt-2 flex items-center justify-center gap-4 rounded-2xl bg-[var(--bg-soft)] py-3.5">
              <div className="text-center">
                <LetterChip pct={sim.current} big />
                <p className="tnum mt-1 text-[10px] font-bold text-[var(--muted)]">{sim.current?.toFixed(1)}% now</p>
              </div>
              <ArrowRight size={16} className="text-[var(--faint)]" />
              <div className="text-center">
                <motion.span key={letterFor(sim.simulated)} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-block">
                  <LetterChip pct={sim.simulated} big />
                </motion.span>
                <p className="tnum mt-1 text-[10px] font-bold" style={{ color: gradeColor(sim.simulated) }}>
                  {sim.simulated?.toFixed(1)}% after
                </p>
              </div>
              {delta != null && (
                <span
                  className="tnum rounded-lg px-2 py-1 text-[11px] font-extrabold"
                  style={{
                    color: delta >= 0 ? "var(--primary)" : "var(--coral)",
                    background: delta >= 0 ? "var(--primary-soft)" : "var(--coral-soft)",
                  }}
                >
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(1)}
                </span>
              )}
            </div>

            {/* target grade */}
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">I want a final grade of</p>
              <div className="w-[240px]">
                <Seg
                  size="sm"
                  options={[
                    { value: "A", label: "A" },
                    { value: "A-", label: "A−" },
                    { value: "B+", label: "B+" },
                    { value: "B", label: "B" },
                  ]}
                  value={target}
                  onChange={setTarget}
                />
              </div>
              {need.needed != null && (
                <p className="mt-2.5 rounded-xl bg-[var(--bg-soft)] px-3.5 py-2.5 text-xs font-semibold leading-relaxed">
                  {need.needed <= 0 ? (
                    <span className="text-[var(--primary)]">Already secured — even a 0 keeps your {target}.</span>
                  ) : need.needed > 100 ? (
                    <span className="text-[var(--coral)]">
                      Needs {need.needed.toFixed(1)}% — out of reach. Aim a letter lower or hunt extra credit.
                    </span>
                  ) : (
                    <>
                      Score at least{" "}
                      <span className="font-display tnum font-extrabold" style={{ color: gradeColor(sim.simulated) }}>
                        {need.needed.toFixed(1)}%
                      </span>{" "}
                      on the {need.target?.name} to lock in a {target}.
                    </>
                  )}
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-[var(--bg-soft)] px-4 py-3 text-xs font-semibold text-[var(--muted)]">
            Everything in {course.code} is already graded — nothing left to simulate.
          </p>
        )}
      </div>
    </section>
  );
}

/* ————— course detail card ————— */
function CourseCard({ course, onAdd, index }: { course: Course; onAdd: () => void; index: number }) {
  const { deleteGradeItem, toast } = useStore();
  const pct = coursePct(course);
  const { gradedWeight } = courseEarned(course);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card overflow-hidden"
    >
      <div className="flex items-center gap-3 border-b border-[var(--line)] p-4">
        <Ring size={54} stroke={5} value={(pct ?? 0) / 100} color={course.color}>
          <span className="tnum text-[11px] font-extrabold">{pct == null ? "–" : pct.toFixed(0)}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] font-bold" style={{ color: course.color }}>
            {course.code} · {course.credits} cr
          </p>
          <h3 className="truncate text-[15px] font-bold">{course.name}</h3>
          <p className="text-[10.5px] font-semibold text-[var(--faint)]">
            {course.professor} · {gradedWeight}% graded
          </p>
        </div>
        <LetterChip pct={pct} big />
      </div>

      {/* categories */}
      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        {course.categories.map((cat) => {
          const avg = categoryAvg(course, cat.id);
          return (
            <div key={cat.id} className="flex items-center gap-3">
              <span className="w-[86px] shrink-0 truncate text-[11.5px] font-bold text-[var(--muted)]">{cat.name}</span>
              <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[var(--bg-soft)]">
                <div
                  className="bar-grow h-full rounded-full"
                  style={{
                    width: `${avg ?? 0}%`,
                    background: avg == null ? "transparent" : `color-mix(in srgb, ${course.color} 80%, transparent)`,
                    border: avg == null ? "1px dashed var(--line-strong)" : "none",
                  }}
                />
              </div>
              <span className="tnum w-12 shrink-0 text-right text-[11px] font-bold">
                {avg == null ? "—" : `${avg.toFixed(1)}%`}
              </span>
              <span className="tnum w-9 shrink-0 text-right text-[10px] font-bold text-[var(--faint)]">{cat.weight}%</span>
            </div>
          );
        })}
      </div>

      {/* items */}
      {course.items.length > 0 && (
        <div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {[...course.items]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 4)
            .map((i) => {
              const p = (i.score / i.max) * 100;
              return (
                <div key={i.id} className="group flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{i.name}</span>
                  <span className="text-[10px] font-semibold text-[var(--faint)]">{format(parseISO(i.date), "MMM d")}</span>
                  <span className="tnum text-xs font-bold" style={{ color: gradeColor(p) }}>
                    {i.score}/{i.max}
                  </span>
                  <button
                    onClick={() => {
                      haptic(10);
                      deleteGradeItem(course.id, i.id);
                      toast("Grade removed", "warn");
                    }}
                    className="grid h-8 w-8 place-items-center rounded-lg text-[var(--faint)] opacity-60 transition hover:bg-[var(--coral-soft)] hover:text-[var(--coral)] hover:opacity-100"
                    aria-label="Delete grade"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
        </div>
      )}

      <button
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-1.5 border-t border-[var(--line)] py-3 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
      >
        <Plus size={14} /> Log a grade
      </button>
    </motion.section>
  );
}

/* ————— main screen ————— */
export default function GradesScreen({ intent, onIntentHandled }: { intent: { kind: string; ts: number } | null; onIntentHandled: () => void }) {
  const { state } = useStore();
  const [sheetCourse, setSheetCourse] = useState<Course | null>(null);
  const simRef = useRef<HTMLDivElement>(null);
  const g = gpa(state.courses);
  const avgAll = useMemo(() => {
    const pcts = state.courses.map((c) => coursePct(c)).filter((p): p is number => p != null);
    return pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
  }, [state.courses]);

  useEffect(() => {
    if (!intent) return;
    if (intent.kind === "grade") {
      setSheetCourse(state.courses[0] ?? null);
      onIntentHandled();
    } else if (intent.kind === "whatif") {
      window.setTimeout(() => simRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      onIntentHandled();
    }
  }, [intent, onIntentHandled, state.courses]);

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-end justify-between px-5 pb-3 pt-2">
        <div>
          <h1 className="font-display text-xl font-extrabold">Grades</h1>
          <p className="text-[11px] font-semibold text-[var(--muted)]">Weighted, live, and mercilessly honest</p>
        </div>
        <div className="flex gap-2">
          <span className="chip tnum text-[var(--primary)]!">GPA {g == null ? "–" : g.toFixed(2)}</span>
          <span className="chip tnum">avg {avgAll == null ? "–" : `${avgAll.toFixed(1)}%`}</span>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8">
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp size={14} className="text-[var(--primary)]" />
            <h3 className="font-display text-[13px] font-bold">Momentum</h3>
          </div>
          <TrendChart courses={state.courses} />
        </div>

        <div className="mt-3 card p-4">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={14} className="text-[var(--sky)]" />
            <h3 className="font-display text-[13px] font-bold">Standings</h3>
          </div>
          <StandingsBars courses={state.courses} />
        </div>

        <div ref={simRef} className="mt-3 scroll-mt-2">
          <Simulator courses={state.courses} />
        </div>

        <div className="mt-5">
          <SectionHead title="Course breakdown" />
        </div>
        <div className="flex flex-col gap-3">
          {state.courses.map((c, i) => (
            <CourseCard key={c.id} course={c} index={i} onAdd={() => setSheetCourse(c)} />
          ))}
        </div>
        {state.courses.length === 0 && (
          <div className="card mt-3 py-8 text-center text-xs font-semibold text-[var(--muted)]">
            No courses yet — add one from the drawer menu.
          </div>
        )}
      </div>

      <GradeSheet course={sheetCourse} open={!!sheetCourse} onClose={() => setSheetCourse(null)} />
    </div>
  );
}
