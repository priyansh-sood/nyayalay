import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Scale, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { authApi } from "../lib/api";
import { useAuth } from "../App";

type Mode = "login" | "register";

const ROLES = [
  { value: "judge", labelKey: "auth.roleJudge" },
  { value: "lawyer", labelKey: "auth.roleLawyer" },
  { value: "clerk", labelKey: "auth.roleClerk" },
];

const DEMO_CREDENTIALS = [
  { email: "judge@court.in", password: "Judge@123", role: "Judge" },
  { email: "lawyer@court.in", password: "Lawyer@123", role: "Advocate" },
  { email: "clerk@court.in", password: "Clerk@123", role: "Clerk" },
];

export default function Login() {
  const { t } = useTranslation();
  const { login, token, isDemo } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("lawyer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isDemoParam = new URLSearchParams(window.location.search).get("demo") === "true";

  useEffect(() => {
    if (token || isDemo) navigate("/dashboard");
  }, [token, isDemo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const data = await authApi.login(email, password);
        login(data.access_token, data.user);
        navigate("/dashboard");
      } else {
        await authApi.register({ email, full_name: fullName, password, role });
        // Auto-login after register
        const data = await authApi.login(email, password);
        login(data.access_token, data.user);
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { detail?: string } } })?.response?.data;
      setError(errData?.detail || t("errors.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setMode("login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex-col items-center justify-center p-12 text-primary-foreground relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-8">
            <Scale className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-serif text-5xl font-bold mb-2 text-white">न्यायालय</h1>
          <p className="text-xl text-white/80 mb-3">Nyayalay</p>
          <p className="text-white/60 text-sm max-w-xs mx-auto leading-relaxed">
            Legal Case Management System for Indian Courts
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              { label: "JWT Auth", desc: "Role-based access" },
              { label: "AI OCR", desc: "Document intelligence" },
              { label: "RAG Search", desc: "Legal precedents" },
              { label: "Cause List", desc: "Auto-scheduling" },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-white/10 rounded-xl p-3">
                <p className="font-semibold text-white text-sm">{label}</p>
                <p className="text-white/60 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-foreground">न्यायालय</h1>
              <p className="text-xs text-muted-foreground">Legal Case Management</p>
            </div>
          </div>

          <h2 className="font-serif text-3xl font-bold text-foreground mb-1">
            {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            {mode === "login" ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}
          </p>

          {/* Demo mode hint */}
          {isDemoParam && (
            <div className="mb-5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">🎭 {t("auth.demoHint")}</p>
            </div>
          )}

          {/* Quick Demo Fill */}
          {mode === "login" && (
            <div className="mb-5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Demo Login</p>
              <div className="flex gap-2 flex-wrap">
                {DEMO_CREDENTIALS.map((cred) => (
                  <button
                    key={cred.role}
                    type="button"
                    onClick={() => fillDemo(cred)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-accent transition-colors"
                  >
                    {cred.role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.fullName")}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Hon'ble Justice / Adv. ..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="judge@court.in"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.role")}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{t(r.labelKey)}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? t("auth.loginBtn") : t("auth.registerBtn")}
            </button>
          </form>

          {/* Switch mode */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-primary font-medium hover:underline"
            >
              {mode === "login" ? t("auth.registerBtn") : t("auth.loginBtn")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
