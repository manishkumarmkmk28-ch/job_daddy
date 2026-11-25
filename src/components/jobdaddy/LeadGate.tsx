import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react";
import type { Lead } from "@/lib/leads";

const CODES = ["+91", "+1", "+44", "+971", "+65", "+61"];
export const MOCK_OTP = "1234";

export function LeadGate({ onVerified }: { onVerified: (l: Lead) => void }) {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [code, setCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [preferredRole, setPreferredRole] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Please enter your full name.");
    if (!/^\d{7,12}$/.test(phone)) return setErr("Enter a valid phone number.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address.");
    if (!targetRole.trim()) return setErr("Please enter your target role.");
    setErr("");
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setStep("otp");
    }, 700);
  };

  if (step === "otp")
    return (
      <OtpStep
        phone={`${code} ${phone}`}
        onBack={() => setStep("form")}
        onDone={() =>
          onVerified({
            name: name.trim(),
            phone: `${code}${phone}`,
            email: email.trim(),
            targetRole: targetRole.trim(),
            preferredRole: preferredRole.trim(),
            timestamp: new Date().toISOString(),
          })
        }
      />
    );

  const input =
    "rounded-lg border border-input bg-background/60 px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 transition";
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Scan your resume free</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify once — we'll send your report instantly.
        </p>
      </div>
      <input
        className={`${input} w-full`}
        placeholder="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex gap-2">
        <select
          className={`${input} w-24 shrink-0`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        >
          {CODES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          className={`${input} min-w-0 flex-1`}
          inputMode="numeric"
          placeholder="Phone number"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))
          }
        />
      </div>
      <input
        className={`${input} w-full`}
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className={`${input} w-full`}
        placeholder="Target Role (e.g. Frontend Developer)"
        value={targetRole}
        onChange={(e) => setTargetRole(e.target.value)}
      />
      <input
        className={`${input} w-full`}
        placeholder="Preferred Role (e.g. React / Full Stack Engineer)"
        value={preferredRole}
        onChange={(e) => setPreferredRole(e.target.value)}
      />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button
        disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-70"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Continue with OTP <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" /> Your details are never shared.
      </p>
    </form>
  );
}

function OtpStep({
  phone,
  onDone,
  onBack,
}: {
  phone: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const verify = (val: string) => {
    if (val === MOCK_OTP) {
      setOk(true);
      setErr("");
      setTimeout(onDone, 600);
    } else setErr("Incorrect code. Try again.");
  };
  const set = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 3) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) verify(next.join(""));
  };

  return (
    <div className="space-y-5 text-center">
      <ShieldCheck
        className={`mx-auto h-10 w-10 ${ok ? "text-success" : "text-primary"}`}
      />
      <div>
        <h2 className="text-2xl font-bold">Enter verification code</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sent to {phone} ·{" "}
          <span className="text-primary">Demo code: {MOCK_OTP}</span>
        </p>
      </div>
      <div className="flex justify-center gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            inputMode="numeric"
            maxLength={1}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d && i > 0)
                refs.current[i - 1]?.focus();
            }}
            className={`h-14 w-12 rounded-lg border bg-background/60 text-center text-2xl font-bold outline-none transition focus:border-primary ${
              ok ? "border-success" : err ? "border-destructive" : "border-input"
            }`}
          />
        ))}
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="text-sm text-muted-foreground">
        {timer > 0 ? (
          <>
            Resend code in{" "}
            <span className="text-foreground">
              0:{String(timer).padStart(2, "0")}
            </span>
          </>
        ) : (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setTimer(30);
              setDigits(["", "", "", ""]);
              refs.current[0]?.focus();
            }}
          >
            Resend code
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Change details
      </button>
    </div>
  );
}