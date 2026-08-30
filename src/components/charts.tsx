import React from "react";
import { motion } from "framer-motion";
import { coursePct, gradeColor, letterFor, type Course } from "../lib/store";
import { LetterChip } from "./ui";

/* ————— cumulative average trend (area chart) ————— */
export function TrendChart({ courses, height = 130 }: { courses: Course[]; height?: number }) {
  const pts = courses
    .flatMap((c) => c.items.map((i) => ({ date: i.date, pct: (i.score / i.max) * 100 })))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (pts.length < 2)
    return <p className="py-8 text-center text-xs text-[var(--muted)]">Log a few grades to see your trend.</p>;

  // cumulative average
  const cum: number[] = [];
  pts.reduce((s, p, i) => {
    const v = s + p.pct;
    cum.push(v / (i + 1));
    return v;
  }, 0);

  const W = 320;
  const H = height;
  const pad = { l: 6, r: 6, t: 12, b: 20 };
  const min = Math.max(0, Math.floor(Math.min(...cum) - 6));
  const max = Math.min(100, Math.ceil(Math.max(...cum) + 3));
  const x = (i: number) => pad.l + (i / (cum.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

  const line = cum.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(cum.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const last = cum[cum.length - 1];
  const gid = "trendGrad";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={pad.l}
            x2={W - pad.r}
            y1={pad.t + f * (H - pad.t - pad.b)}
            y2={pad.t + f * (H - pad.t - pad.b)}
            stroke="var(--line)"
            strokeDasharray="3 5"
          />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" className="draw-line" />
        {cum.map((v, i) =>
          i === cum.length - 1 ? (
            <g key={i}>
              <circle cx={x(i)} cy={y(v)} r="7" fill="var(--primary)" opacity="0.22" />
              <circle cx={x(i)} cy={y(v)} r="3.4" fill="var(--primary)" stroke="var(--raised-solid)" strokeWidth="1.6" />
            </g>
          ) : null,
        )}
        <text x={pad.l} y={H - 5} fontSize="9.5" fill="var(--faint)" fontWeight={600}>
          {pts[0].date.slice(5).replace("-", "/")}
        </text>
        <text x={W - pad.r} y={H - 5} fontSize="9.5" fill="var(--faint)" fontWeight={600} textAnchor="end">
          today
        </text>
        <text x={pad.l} y={y(max) + 2} fontSize="9.5" fill="var(--faint)" fontWeight={600}>
          {max}%
        </text>
      </svg>
      <div className="mt-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold text-[var(--muted)]">Running average · {pts.length} graded items</span>
        <span className="font-display tnum text-sm font-bold" style={{ color: gradeColor(last) }}>
          {last.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/* ————— course standings (horizontal bars) ————— */
export function StandingsBars({ courses }: { courses: Course[] }) {
  const rows = courses
    .map((c) => ({ c, pct: coursePct(c) }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  return (
    <div className="flex flex-col gap-3">
      {rows.map(({ c, pct }, i) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3"
        >
          <span className="font-display w-[72px] shrink-0 truncate text-[11px] font-bold text-[var(--muted)]">{c.code}</span>
          <div className="relative h-[10px] flex-1 overflow-hidden rounded-full bg-[var(--bg-soft)]">
            <div
              className="bar-grow absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${pct ?? 0}%`,
                background: `linear-gradient(90deg, color-mix(in srgb, ${c.color} 55%, transparent), ${c.color})`,
                animationDelay: `${i * 0.06}s`,
              }}
            />
          </div>
          <span className="tnum w-11 shrink-0 text-right text-xs font-bold">
            {pct == null ? "—" : `${pct.toFixed(1)}%`}
          </span>
          <LetterChip pct={pct} />
        </motion.div>
      ))}
    </div>
  );
}
