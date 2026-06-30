import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useContext, useEffect, useState } from "react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseView from "./pages/CaseView";
import Upload from "./pages/Upload";
import CauseListPage from "./pages/CauseListPage";
import AlertsPage from "./pages/AlertsPage";
import ResearchPage from "./pages/ResearchPage";

// ── Theme Context ─────────────────────────────────────────────────────────────
interface ThemeContextType {
  dark: boolean;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  dark: false,
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ── Auth Context ──────────────────────────────────────────────────────────────
interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isDemo: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isDemo: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

// ── Auth Guard ────────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isDemo } = useAuth();
  if (!token && !isDemo) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  const isDemo = new URLSearchParams(window.location.search).get("demo") === "true";

  // Apply dark mode to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Auto-login for demo mode
  useEffect(() => {
    if (isDemo && !user) {
      const demoUser: User = {
        id: 1,
        email: "judge@court.in",
        full_name: "Hon'ble Justice Rajendra Kumar Mishra",
        role: "judge",
      };
      setUser(demoUser);
      setToken("demo_token");
    }
  }, [isDemo, user]);

  const login = (t: string, u: User) => {
    setToken(t);
    setUser(u);
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      <AuthContext.Provider value={{ user, token, login, logout, isDemo }}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="cases" element={<Cases />} />
              <Route path="cases/:id" element={<CaseView />} />
              <Route path="cases/:id/upload" element={<Upload />} />
              <Route path="cause-list" element={<CauseListPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="research" element={<ResearchPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
