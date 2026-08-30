import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap, LayoutGrid, ListTodo, Settings } from "lucide-react";
import { format } from "date-fns";
import { StoreProvider, haptic, useStore } from "./lib/store";
import { ToastHost } from "./components/ui";
import LockScreen from "./screens/LockScreen";
import Dashboard from "./screens/Dashboard";
import TasksScreen from "./screens/TasksScreen";
import GradesScreen from "./screens/GradesScreen";
import SettingsScreen from "./screens/SettingsScreen";
import CoursesDrawer from "./screens/CoursesDrawer";

type Tab = "home" | "tasks" | "grades" | "settings";

const TABS: { key: Tab; label: string; icon: (p: { size: number }) => React.ReactNode }[] = [
  { key: "home", label: "Home", icon: (p) => <LayoutGrid {...p} /> },
  { key: "tasks", label: "Tasks", icon: (p) => <ListTodo {...p} /> },
  { key: "grades", label: "Grades", icon: (p) => <GraduationCap {...p} /> },
  { key: "settings", label: "Settings", icon: (p) => <Settings {...p} /> },
];

function StatusBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="relative z-30 flex h-11 shrink-0 items-center justify-between px-7 pt-1">
      <span className="tnum text-[12px] font-bold">{format(now, "h:mm")}</span>
      <span className="absolute left-1/2 top-[7px] h-[18px] w-[74px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-1.5">
        <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
          <rect x="0" y="7" width="2.4" height="4" rx="0.8" />
          <rect x="4" y="4.6" width="2.4" height="6.4" rx="0.8" />
          <rect x="8" y="2.2" width="2.4" height="8.8" rx="0.8" />
          <rect x="12" y="0" width="2.4" height="11" rx="0.8" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1.5 3.8a10 10 0 0 1 13 0" />
          <path d="M3.8 6.2a6.5 6.5 0 0 1 8.4 0" />
          <circle cx="8" cy="9" r="1.1" fill="currentColor" stroke="none" />
        </svg>
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
          <rect x="0.5" y="0.5" width="18" height="10" rx="3" stroke="currentColor" opacity="0.5" />
          <rect x="2" y="2" width="12.5" height="7" rx="1.6" fill="currentColor" />
          <path d="M20.5 3.5v4a2 2 0 0 0 0-4z" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  );
}

function Shell() {
  const { state } = useStore();
  const [locked, setLocked] = useState(true);
  const [tab, setTab] = useState<Tab>("home");
  const [drawer, setDrawer] = useState(false);
  const [intent, setIntent] = useState<{ kind: string; ts: number } | null>(null);

  const needsLock =
    !state.settings.setupDone || (state.settings.passcode != null && state.settings.autoLock);

  const go = (t: Tab) => {
    haptic(6);
    setTab(t);
  };
  const quick = (kind: "task" | "grade" | "whatif") => {
    haptic(8);
    if (kind === "task") setTab("tasks");
    else setTab("grades");
    setIntent({ kind, ts: Date.now() });
  };

  return (
    <div className="flex h-full items-center justify-center gap-14 px-6">
      {/* ————— desktop side rail ————— */}
      <aside className="hidden w-[250px] shrink-0 flex-col lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#0e5e4c] to-[#0a3d33] text-[#3fd9ae] shadow-[0_10px_24px_-8px_rgba(63,217,174,0.45)]">
            <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
              <path d="M32 14 8 25l24 11 24-11-24-11z" fill="currentColor" />
              <path d="M17 32.5v10c0 3.6 6.7 8 15 8s15-4.4 15-8v-10l-15 7-15-7z" fill="#e8f1ec" />
            </svg>
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            i<span className="text-[var(--primary)]">Graded</span>
          </span>
        </div>
        <p className="font-display mt-6 text-[26px] font-extrabold leading-[1.15] tracking-tight">
          Your semester,
          <br />
          under <span className="text-[var(--primary)]">command.</span>
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--muted)]">
          An academic command center — weighted grade engine, what-if simulator, and a ruthless task board. Fully interactive prototype of the Flutter build.
        </p>
        <ul className="mt-7 flex flex-col gap-3">
          {[
            ["Swipe tasks", "right to complete, left to delete, undo included"],
            ["Drag to rank", "reorder your day by what actually matters"],
            ["Simulate finals", "slide a score, watch the letter grade move"],
            ["Lock it down", "passcode + Face ID gate your GPA"],
          ].map(([t, s]) => (
            <li key={t} className="flex gap-3">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
              <span>
                <span className="block text-[13px] font-bold">{t}</span>
                <span className="block text-[11.5px] font-semibold text-[var(--faint)]">{s}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-auto text-[10.5px] font-semibold text-[var(--faint)]">
          v1.0 · data never leaves this device
        </p>
      </aside>

      {/* ————— phone ————— */}
      <div
        className="relative shrink-0 overflow-hidden bg-[var(--phone-wall)] text-[var(--text)] sm:rounded-[3rem] sm:border sm:border-[var(--line-strong)] sm:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)]"
        style={{
          width: "min(392px, 100vw)",
          height: "min(820px, 100dvh)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 z-[70] rounded-none ring-1 ring-inset ring-white/5 sm:rounded-[3rem]" />
        <div className="flex h-full flex-col bg-[var(--bg)]">
          <StatusBar />

          {locked && needsLock ? (
            <div className="relative min-h-0 flex-1">
              <LockScreen onUnlock={() => setLocked(false)} />
            </div>
          ) : (
            <>
              <div className="relative min-h-0 flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    className="h-full"
                    initial={{ opacity: 0, x: 26 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  >
                    {tab === "home" && (
                      <Dashboard
                        goTasks={() => go("tasks")}
                        goGrades={() => go("grades")}
                        goSettings={() => go("settings")}
                        onMenu={() => {
                          haptic(8);
                          setDrawer(true);
                        }}
                        onQuick={quick}
                      />
                    )}
                    {tab === "tasks" && <TasksScreen intent={intent} onIntentHandled={() => setIntent(null)} />}
                    {tab === "grades" && <GradesScreen intent={intent} onIntentHandled={() => setIntent(null)} />}
                    {tab === "settings" && <SettingsScreen />}
                  </motion.div>
                </AnimatePresence>

                <CoursesDrawer open={drawer} onClose={() => setDrawer(false)} />
                <ToastHost />
              </div>

              {/* ————— bottom nav ————— */}
              <nav className="relative z-30 shrink-0 border-t border-[var(--line)] bg-[var(--surface)]/95 px-3 pb-4 pt-2 backdrop-blur">
                <div className="grid grid-cols-4">
                  {TABS.map((t) => {
                    const active = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => go(t.key)}
                        className="relative flex min-h-[52px] flex-col items-center justify-center gap-0.5"
                        aria-label={t.label}
                      >
                        {active && (
                          <motion.span
                            layoutId="nav-pill"
                            className="absolute inset-x-4 top-0 h-[3px] rounded-full bg-[var(--primary)]"
                            transition={{ type: "spring", stiffness: 500, damping: 40 }}
                          />
                        )}
                        <motion.span
                          animate={{ scale: active ? 1 : 0.92, y: active ? -1 : 0 }}
                          className="grid h-8 w-14 place-items-center rounded-full transition-colors"
                          style={{
                            background: active ? "var(--primary-soft)" : "transparent",
                            color: active ? "var(--primary)" : "var(--faint)",
                          }}
                        >
                          {t.icon({ size: 19 })}
                        </motion.span>
                        <span
                          className="text-[9.5px] font-bold"
                          style={{ color: active ? "var(--text)" : "var(--faint)" }}
                        >
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mx-auto mt-1.5 h-[5px] w-[120px] rounded-full bg-[var(--line-strong)]" />
              </nav>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[var(--bg)]">
      {/* ambient layers */}
      <div className="stage-grid absolute inset-0" />
      <div className="pointer-events-none absolute -left-32 top-[-120px] h-[440px] w-[440px] rounded-full bg-[var(--primary)] opacity-[0.06] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-160px] right-[-120px] h-[480px] w-[480px] rounded-full bg-[var(--amber)] opacity-[0.05] blur-3xl" />
      {/* floating grade glyphs */}
      {[
        { t: "A+", x: "8%", y: "16%", r: "-8deg", d: "7s", c: "var(--primary)" },
        { t: "97.4", x: "88%", y: "12%", r: "6deg", d: "9s", c: "var(--sky)" },
        { t: "Σ wᵢ·gᵢ", x: "12%", y: "78%", r: "5deg", d: "8s", c: "var(--amber)" },
        { t: "4.0", x: "85%", y: "74%", r: "-6deg", d: "10s", c: "var(--coral)" },
        { t: "∫", x: "78%", y: "42%", r: "10deg", d: "11s", c: "var(--faint)" },
      ].map((g) => (
        <span
          key={g.t}
          className="font-display pointer-events-none absolute hidden text-2xl font-extrabold opacity-25 lg:block"
          style={{ left: g.x, top: g.y, color: g.c, animation: `floaty ${g.d} ease-in-out infinite`, ["--rot" as string]: g.r }}
        >
          {g.t}
        </span>
      ))}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Stage>
        <Shell />
      </Stage>
    </StoreProvider>
  );
}
