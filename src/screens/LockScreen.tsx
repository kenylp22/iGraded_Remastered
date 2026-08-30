import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, ScanFace, ShieldCheck } from "lucide-react";
import { haptic, useStore } from "../lib/store";

const CODE_LEN = 4;

export function PinPad({
  onKey,
  onDelete,
  disabled,
}: {
  onKey: (k: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-3">
      {keys.map((k, i) =>
        k === "" ? (
          <span key={i} />
        ) : (
          <motion.button
            key={k}
            whileTap={{ scale: 0.9 }}
            disabled={disabled}
            onClick={() => {
              haptic(8);
              if (k === "del") onDelete();
              else onKey(k);
            }}
            className={`font-display grid h-[62px] w-[62px] place-items-center justify-self-center rounded-full border text-xl font-semibold transition ${
              k === "del"
                ? "border-transparent text-[var(--muted)]"
                : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]"
            }`}
            aria-label={k === "del" ? "Delete digit" : `Digit ${k}`}
          >
            {k === "del" ? <Delete size={20} /> : k}
          </motion.button>
        ),
      )}
    </div>
  );
}

function Dots({ len, error }: { len: number; error: boolean }) {
  return (
    <div className={`flex items-center gap-3.5 ${error ? "animate-shake" : ""}`}>
      {Array.from({ length: CODE_LEN }).map((_, i) => (
        <motion.span
          key={i}
          animate={{ scale: i < len ? 1 : 0.82 }}
          className="h-3.5 w-3.5 rounded-full border"
          style={{
            background: i < len ? (error ? "var(--coral)" : "var(--primary)") : "transparent",
            borderColor: i < len ? "transparent" : "var(--line-strong)",
          }}
        />
      ))}
    </div>
  );
}

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { state, patchSettings, toast, wipeAll } = useStore();
  const hasCode = !!state.settings.passcode;
  const [stage, setStage] = useState<"setup" | "confirm" | "enter">(hasCode ? "enter" : "setup");
  const [code, setCode] = useState("");
  const [first, setFirst] = useState("");
  const [error, setError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const title =
    stage === "setup" ? "Create a passcode" : stage === "confirm" ? "Confirm passcode" : "iGraded is locked";
  const sub =
    stage === "setup"
      ? "Your grades are private. Choose a 4-digit passcode."
      : stage === "confirm"
        ? "Enter it once more to lock it in."
        : "Verify it's really you.";

  const fail = () => {
    haptic(40);
    setError(true);
    setCode("");
    window.setTimeout(() => setError(false), 450);
  };

  const submit = (c: string) => {
    if (stage === "setup") {
      setFirst(c);
      setCode("");
      setStage("confirm");
    } else if (stage === "confirm") {
      if (c === first) {
        patchSettings({ passcode: c, setupDone: true });
        haptic(24);
        toast("Passcode set — app locked", "ok");
        onUnlock();
      } else {
        fail();
        setStage("setup");
        setFirst("");
        window.setTimeout(() => toast("Codes didn't match — start over", "warn"), 350);
      }
    } else if (c === state.settings.passcode) {
      haptic(20);
      onUnlock();
    } else {
      fail();
    }
  };

  const onKey = (k: string) => {
    if (code.length >= CODE_LEN) return;
    const next = code + k;
    setCode(next);
    if (next.length === CODE_LEN) window.setTimeout(() => submit(next), 160);
  };

  const faceId = () => {
    if (scanning) return;
    haptic(10);
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      haptic(24);
      toast("Identity verified", "ok");
      onUnlock();
    }, 1500);
  };

  useEffect(() => {
    const t = window.setTimeout(() => setResetArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [resetArmed]);

  // if the code disappears mid-session (wipe), fall back to setup
  useEffect(() => {
    if (!hasCode && stage === "enter") {
      setStage("setup");
      setCode("");
    }
  }, [hasCode, stage]);

  return (
    <div className="flex h-full flex-col items-center bg-[var(--bg)] px-8">
      {/* ambient rings */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--primary)] opacity-[0.07] blur-3xl" />
        <div className="absolute bottom-10 -left-20 h-60 w-60 rounded-full bg-[var(--amber)] opacity-[0.05] blur-3xl" />
      </div>

      <div className="relative mt-14 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {scanning ? (
            <motion.div
              key="scan"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-[1.4rem] border border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
            >
              <ScanFace size={38} />
              <motion.span
                className="absolute inset-x-2 h-[2px] rounded-full bg-[var(--primary)]"
                animate={{ top: ["15%", "80%", "15%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ boxShadow: "0 0 12px var(--primary)" }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="logo"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid h-20 w-20 place-items-center rounded-[1.4rem] bg-gradient-to-br from-[#0e5e4c] to-[#0a3d33] text-[#3fd9ae] shadow-[0_12px_30px_-10px_rgba(63,217,174,0.4)]"
            >
              <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                <path d="M32 14 8 25l24 11 24-11-24-11z" fill="currentColor" />
                <path d="M17 32.5v10c0 3.6 6.7 8 15 8s15-4.4 15-8v-10l-15 7-15-7z" fill="#e8f1ec" />
                <circle cx="50" cy="34" r="2.4" fill="currentColor" />
                <path d="M50 36v8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.h1
          key={title}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display mt-6 text-xl font-bold"
        >
          {title}
        </motion.h1>
        <p className="mt-1.5 max-w-[240px] text-center text-[13px] leading-relaxed text-[var(--muted)]">{sub}</p>

        <div className="mt-8">
          <Dots len={code.length} error={error} />
        </div>

        <div className="mt-8">
          <PinPad onKey={onKey} onDelete={() => setCode((c) => c.slice(0, -1))} disabled={scanning} />
        </div>

        {stage !== "enter" && (
          <button
            onClick={() => {
              patchSettings({ setupDone: true });
              onUnlock();
            }}
            className="mt-6 text-[11.5px] font-bold text-[var(--muted)] underline-offset-4 transition hover:text-[var(--text)] hover:underline"
          >
            Skip for now — set it later in Settings
          </button>
        )}

        {stage === "enter" && state.settings.biometric && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={faceId}
            className="mt-7 flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-2.5 text-[13px] font-bold text-[var(--primary)] transition hover:border-[var(--primary)]"
          >
            <ScanFace size={17} />
            Use Face ID
          </motion.button>
        )}

        {stage === "enter" && (
          <button
            onClick={() => {
              if (!resetArmed) {
                setResetArmed(true);
                return;
              }
              wipeAll();
              onUnlock();
            }}
            className="mt-6 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--faint)] transition hover:text-[var(--coral)]"
          >
            <ShieldCheck size={12} />
            {resetArmed ? "Tap again to erase everything" : "Forgot passcode? Reset app"}
          </button>
        )}
      </div>
    </div>
  );
}
