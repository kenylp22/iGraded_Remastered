import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BellRing,
  Cloud,
  CloudOff,
  Database,
  Download,
  FileJson,
  Fingerprint,
  Info,
  Lock,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  exportBackupJSON,
  exportGradesCSV,
  exportTasksCSV,
  haptic,
  useStore,
} from "../lib/store";
import { HoldButton, Modal, Seg, Sheet, Toggle } from "../components/ui";
import { PinPad } from "./LockScreen";

function Row({
  icon,
  tint,
  label,
  sub,
  right,
  onClick,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${onClick ? "transition hover:bg-[var(--bg-soft)]" : ""}`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)`, color: tint }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold">{label}</span>
        {sub && <span className="block text-[11px] font-semibold text-[var(--faint)]">{sub}</span>}
      </span>
      {right}
    </Comp>
  );
}

function PasscodeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, patchSettings, toast } = useStore();
  const hasCode = !!state.settings.passcode;
  const [stage, setStage] = useState<"verify" | "new" | "confirm">(hasCode ? "verify" : "new");
  const [entry, setEntry] = useState("");
  const [first, setFirst] = useState("");

  const reset = () => {
    setStage(hasCode ? "verify" : "new");
    setEntry("");
    setFirst("");
  };

  const submit = (code: string) => {
    if (stage === "verify") {
      if (code === state.settings.passcode) {
        setStage("new");
        setEntry("");
      } else {
        haptic(36);
        toast("Current passcode is wrong", "err");
        setEntry("");
      }
    } else if (stage === "new") {
      setFirst(code);
      setStage("confirm");
      setEntry("");
    } else if (code === first) {
      patchSettings({ passcode: code });
      haptic(20);
      toast("Passcode updated", "ok");
      reset();
      onClose();
    } else {
      haptic(36);
      toast("Codes didn't match", "err");
      reset();
    }
  };

  const onKey = (k: string) => {
    const next = (entry + k).slice(0, 4);
    setEntry(next);
    if (next.length === 4) window.setTimeout(() => submit(next), 150);
  };

  const title = stage === "verify" ? "Enter current passcode" : stage === "new" ? "Choose a new passcode" : "Confirm new passcode";

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title="Change passcode">
      <p className="mb-4 text-center text-xs font-semibold text-[var(--muted)]">{title}</p>
      <div className="mb-5 flex justify-center gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-full border"
            style={{
              background: i < entry.length ? "var(--primary)" : "transparent",
              borderColor: i < entry.length ? "transparent" : "var(--line-strong)",
            }}
          />
        ))}
      </div>
      <div className="flex justify-center pb-2">
        <PinPad onKey={onKey} onDelete={() => setEntry((e) => e.slice(0, -1))} />
      </div>
    </Sheet>
  );
}

export default function SettingsScreen() {
  const { state, patchSettings, toast, wipeAll, syncNow } = useStore();
  const [passcodeSheet, setPasscodeSheet] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const s = state.settings;

  const counts = useMemo(
    () => ({
      courses: state.courses.length,
      grades: state.courses.reduce((n, c) => n + c.items.length, 0),
      tasks: state.tasks.length,
    }),
    [state],
  );

  const testNotification = async () => {
    haptic(10);
    try {
      if ("Notification" in window) {
        const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (perm === "granted") {
          new Notification("iGraded · Reminder", { body: "Pre-lab writeup is due today at 11:59 PM." });
          toast("Reminder sent to your device", "ok");
          return;
        }
      }
    } catch {
      /* sandboxed */
    }
    toast("Preview: “Pre-lab writeup is due today at 11:59 PM”", "ok");
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="px-5 pb-3 pt-2">
        <h1 className="font-display text-xl font-extrabold">Settings</h1>
        <p className="text-[11px] font-semibold text-[var(--muted)]">Your data, your rules</p>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8">
        {/* profile */}
        <div className="card-raised flex items-center gap-3.5 p-4">
          <div className="font-display grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0e5e4c] to-[#0a3d33] text-sm font-extrabold text-[#3fd9ae]">
            MC
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-bold">Maya Chen</p>
            <p className="text-[11.5px] font-semibold text-[var(--muted)]">Spring 2026 · Westbrook University</p>
          </div>
          <span className="chip text-[var(--primary)]!">Pro</span>
        </div>

        {/* appearance */}
        <p className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Appearance</p>
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          <Row
            icon={s.theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            tint={s.theme === "dark" ? "var(--sky)" : "var(--amber)"}
            label="Theme"
            sub="Material You–style, applies instantly"
            right={
              <div className="w-[150px]">
                <Seg
                  size="sm"
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                  value={s.theme}
                  onChange={(v) => patchSettings({ theme: v })}
                />
              </div>
            }
          />
        </div>

        {/* security */}
        <p className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Security</p>
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          <Row icon={<Fingerprint size={16} />} tint="var(--primary)" label="Face ID / biometric unlock" sub="Simulated in this prototype" right={<Toggle on={s.biometric} onChange={(v) => patchSettings({ biometric: v })} />} />
          <Row icon={<Lock size={16} />} tint="var(--sky)" label="Change passcode" sub={s.passcode ? "4-digit PIN active" : "Not set"} right={<span className="text-xs font-bold text-[var(--primary)]">Change</span>} onClick={() => setPasscodeSheet(true)} />
          <Row icon={<ShieldCheck size={16} />} tint="var(--amber)" label="Lock on launch" sub="Require verification each open" right={<Toggle on={s.autoLock} onChange={(v) => patchSettings({ autoLock: v })} />} />
        </div>

        {/* notifications */}
        <p className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Notifications</p>
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          <Row icon={<BellRing size={16} />} tint="var(--coral)" label="Deadline reminders" sub="Local push before each due date" right={<Toggle on={s.notifications} onChange={(v) => patchSettings({ notifications: v })} />} />
          <Row
            icon={<BellRing size={16} />}
            tint="var(--muted)"
            label="Remind me"
            right={
              <div className="w-[150px]">
                <Seg
                  size="sm"
                  options={[
                    { value: "1", label: "1h" },
                    { value: "24", label: "1d" },
                    { value: "48", label: "2d" },
                  ]}
                  value={String(s.remindHours) as "1" | "24" | "48"}
                  onChange={(v) => patchSettings({ remindHours: Number(v) as 1 | 24 | 48 })}
                />
              </div>
            }
          />
          <Row icon={<BellRing size={16} />} tint="var(--primary)" label="Send test reminder" right={<span className="text-xs font-bold text-[var(--primary)]">Test</span>} onClick={testNotification} />
        </div>

        {/* data & sync */}
        <p className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Data & Sync</p>
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          <Row
            icon={s.offline ? <CloudOff size={16} /> : <Cloud size={16} />}
            tint={s.offline ? "var(--amber)" : "var(--primary)"}
            label="Offline mode"
            sub={s.offline ? `${state.pending} change${state.pending === 1 ? "" : "s"} queued locally` : "Writing through to cloud"}
            right={<Toggle on={s.offline} onChange={(v) => { patchSettings({ offline: v }); toast(v ? "Offline — changes queue locally" : "Back online", v ? "warn" : "ok"); }} />}
          />
          <Row
            icon={<RefreshCw size={16} />}
            tint="var(--sky)"
            label="Sync now"
            sub={`Last sync ${formatDistanceToNow(state.lastSync, { addSuffix: true })}`}
            right={<span className="text-xs font-bold text-[var(--primary)]">Sync</span>}
            onClick={() => { haptic(8); syncNow(); }}
          />
        </div>

        {/* privacy dashboard */}
        <p className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Privacy dashboard</p>
        <div className="card overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-[var(--line)] border-b border-[var(--line)] text-center">
            {(
              [
                { n: counts.courses, l: "courses" },
                { n: counts.grades, l: "grades" },
                { n: counts.tasks, l: "tasks" },
              ]
            ).map((x) => (
              <div key={x.l} className="py-3.5">
                <p className="font-display tnum text-lg font-extrabold">{x.n}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--faint)]">{x.l}</p>
              </div>
            ))}
          </div>
          <Row icon={<Download size={16} />} tint="var(--primary)" label="Export grades" sub="CSV · every item with weight & date" right={<span className="text-xs font-bold text-[var(--primary)]">.csv</span>} onClick={() => { exportGradesCSV(state); haptic(12); toast("Grades exported", "ok"); }} />
          <div className="border-t border-[var(--line)]">
            <Row icon={<Download size={16} />} tint="var(--sky)" label="Export tasks" sub="CSV · deadlines, priority, status" right={<span className="text-xs font-bold text-[var(--primary)]">.csv</span>} onClick={() => { exportTasksCSV(state); haptic(12); toast("Tasks exported", "ok"); }} />
          </div>
          <div className="border-t border-[var(--line)]">
            <Row icon={<FileJson size={16} />} tint="var(--amber)" label="Full backup" sub="JSON · everything, machine-readable" right={<span className="text-xs font-bold text-[var(--primary)]">.json</span>} onClick={() => { exportBackupJSON(state); haptic(12); toast("Backup downloaded", "ok"); }} />
          </div>
          <div className="border-t border-[var(--line)]">
            <Row icon={<Trash2 size={16} />} tint="var(--coral)" label="Delete account & data" sub="Local + cloud, permanent, DPA-compliant" right={<span className="text-xs font-bold text-[var(--coral)]">Delete</span>} onClick={() => setDeleteModal(true)} />
          </div>
        </div>

        {/* about */}
        <div className="card mt-5 flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--bg-soft)] text-[var(--muted)]">
            <Info size={16} />
          </span>
          <div className="flex-1">
            <p className="text-[13px] font-bold">iGraded · v1.0.0</p>
            <p className="text-[11px] font-semibold leading-relaxed text-[var(--faint)]">
              Interactive prototype — every byte stays on this device. Supabase sync, Firebase push and native biometrics ship with the Flutter build.
            </p>
          </div>
        </div>
        <div className="h-2" />
      </div>

      <PasscodeSheet open={passcodeSheet} onClose={() => setPasscodeSheet(false)} />

      <Modal open={deleteModal} onClose={() => setDeleteModal(false)}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--coral-soft)] text-[var(--coral)]">
            <Database size={17} />
          </span>
          <div>
            <h3 className="font-display text-base font-bold">Erase everything?</h3>
            <p className="text-[11.5px] font-semibold text-[var(--muted)]">
              {counts.courses} courses, {counts.grades} grades and {counts.tasks} tasks — gone for good. No recovery.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <HoldButton
            label="Hold to permanently delete"
            onConfirm={() => {
              setDeleteModal(false);
              wipeAll();
              toast("All data erased — fresh start", "warn");
            }}
          />
        </div>
        <button onClick={() => setDeleteModal(false)} className="mt-2.5 w-full rounded-xl py-2.5 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--bg-soft)]">
          Keep my data
        </button>
      </Modal>
    </div>
  );
}
