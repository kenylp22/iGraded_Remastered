import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, AlertTriangle, Info, GripVertical } from "lucide-react";
import { dueInfo, gradeColor, haptic, letterFor, useStore, type ToastKind } from "../lib/store";

/* ————— progress ring ————— */
export function Ring({
  size = 64,
  stroke = 6,
  value,
  color,
  track,
  children,
  className = "",
}: {
  size?: number;
  stroke?: number;
  value: number; // 0..1
  color: string;
  track?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ring-anim -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? "var(--line)"} strokeWidth={stroke} />
        <circle
          className="value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ————— bottom sheet ————— */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
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
          <motion.div
            className="absolute inset-x-0 bottom-0 z-50 max-h-[88%] overflow-y-auto no-scrollbar rounded-t-[1.8rem] border border-b-0 border-[var(--line)] bg-[var(--raised-solid)] px-5 pb-8 pt-3"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 500) onClose();
            }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--line-strong)]" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{title}</h2>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bg-soft)] text-[var(--muted)] transition hover:text-[var(--text)]"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ————— centered modal ————— */
export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              className="card-raised pointer-events-auto w-full p-5"
              initial={{ opacity: 0, scale: 0.9, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ————— toggle ————— */
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => {
        haptic(8);
        onChange(!on);
      }}
      className="relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors duration-200"
      style={{ background: on ? "var(--primary)" : "var(--line-strong)" }}
    >
      <motion.span
        className="absolute top-[3px] block h-[22px] w-[22px] rounded-full bg-white shadow"
        animate={{ left: on ? 23 : 3 }}
        transition={{ type: "spring", stiffness: 500, damping: 34 }}
      />
    </button>
  );
}

/* ————— segmented control ————— */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      className={`relative grid rounded-full border border-[var(--line)] bg-[var(--bg-soft)] p-1 ${size === "sm" ? "text-[11px]" : "text-xs"}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      <motion.span
        className="absolute bottom-1 top-1 rounded-full bg-[var(--raised-solid)] shadow-sm ring-1 ring-[var(--line)]"
        animate={{
          left: `calc(${idx} * (100% - 8px) / ${options.length} + 4px)`,
          width: `calc((100% - 8px) / ${options.length})`,
        }}
        transition={{ type: "spring", stiffness: 480, damping: 38 }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => {
            haptic(6);
            onChange(o.value);
          }}
          className={`relative z-10 rounded-full font-semibold transition-colors ${size === "sm" ? "px-2 py-1" : "px-3 py-1.5"} ${
            o.value === value ? "text-[var(--text)]" : "text-[var(--muted)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ————— slider ————— */
export function Slider({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="slider"
      style={{ "--fill": `${value}%`, "--slider-fill": color ?? "var(--primary)" } as React.CSSProperties}
    />
  );
}

/* ————— chips ————— */
export function LetterChip({ pct, big = false }: { pct: number | null; big?: boolean }) {
  const letter = letterFor(pct);
  const color = gradeColor(pct);
  return (
    <span
      className={`font-display inline-flex items-center justify-center rounded-xl font-bold ${
        big ? "h-11 w-11 text-lg" : "h-7 min-w-7 px-1.5 text-[11px]"
      }`}
      style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      {letter}
    </span>
  );
}

export function DueChip({ due, done }: { due: string; done: boolean }) {
  const info = dueInfo(due, done);
  const map = {
    danger: { c: "var(--coral)", bg: "var(--coral-soft)" },
    warn: { c: "var(--amber)", bg: "var(--amber-soft)" },
    ok: { c: "var(--primary)", bg: "var(--primary-soft)" },
    muted: { c: "var(--muted)", bg: "transparent" },
  }[info.tone];
  return (
    <span
      className="tnum inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold"
      style={{ color: map.c, background: map.bg }}
    >
      {info.label}
    </span>
  );
}

export function PriorityFlag({ p }: { p: 0 | 1 | 2 }) {
  const c = ["var(--faint)", "var(--amber)", "var(--coral)"][p];
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-label="priority">
      <path d="M1.5 12V1.2" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M1.5 1.5h7.6L7 4.4l2.1 2.9H1.5z" fill={c} opacity={p === 0 ? 0.4 : 1} />
    </svg>
  );
}

/* ————— hold-to-confirm danger button ————— */
export function HoldButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [prog, setProg] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef(0);
  const done = useRef(false);

  const tick = () => {
    const p = Math.min(1, (Date.now() - start.current) / 1300);
    setProg(p);
    if (p >= 1 && !done.current) {
      done.current = true;
      haptic(30);
      onConfirm();
      window.setTimeout(() => setProg(0), 300);
      return;
    }
    if (p < 1) raf.current = requestAnimationFrame(tick);
  };
  const begin = () => {
    done.current = false;
    start.current = Date.now();
    raf.current = requestAnimationFrame(tick);
  };
  const end = () => {
    cancelAnimationFrame(raf.current);
    if (!done.current) setProg(0);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <button
      onPointerDown={begin}
      onPointerUp={end}
      onPointerLeave={end}
      className="relative w-full overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--coral)_45%,transparent)] py-3 text-sm font-bold text-[var(--coral)] transition active:scale-[0.98]"
    >
      <span
        className="absolute inset-y-0 left-0 bg-[var(--coral-soft)]"
        style={{ width: `${prog * 100}%` }}
      />
      <span className="relative">{prog > 0.05 && prog < 1 ? "Keep holding…" : label}</span>
    </button>
  );
}

/* ————— toasts ————— */
const toastIcon: Record<ToastKind, React.ReactNode> = {
  ok: <Check size={14} />,
  warn: <AlertTriangle size={14} />,
  err: <Info size={14} />,
};
const toastColor: Record<ToastKind, string> = { ok: "var(--primary)", warn: "var(--amber)", err: "var(--coral)" };

export function ToastHost() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 480, damping: 36 }}
            className="card-raised pointer-events-auto flex w-full items-center gap-2.5 py-2.5 pl-3 pr-2"
          >
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
              style={{ background: `color-mix(in srgb, ${toastColor[t.kind]} 18%, transparent)`, color: toastColor[t.kind] }}
            >
              {toastIcon[t.kind]}
            </span>
            <p className="flex-1 truncate text-[13px] font-semibold">{t.msg}</p>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.fn();
                  dismissToast(t.id);
                }}
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismissToast(t.id)} className="grid h-7 w-7 place-items-center rounded-full text-[var(--faint)]">
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ————— misc ————— */
export function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--bg-soft)] text-[var(--faint)]">{icon}</div>
      <p className="font-display text-sm font-bold">{title}</p>
      <p className="max-w-[220px] text-xs leading-relaxed text-[var(--muted)]">{sub}</p>
    </div>
  );
}

export function DragHandle() {
  return (
    <span className="grid h-10 w-7 cursor-grab touch-none place-items-center rounded-lg text-[var(--faint)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--muted)] active:cursor-grabbing">
      <GripVertical size={16} />
    </span>
  );
}

export function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-1">
      <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">{title}</h3>
      {right}
    </div>
  );
}
