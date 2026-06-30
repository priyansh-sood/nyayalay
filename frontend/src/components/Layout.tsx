import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FolderOpen,
  List,
  FileText,
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  Scale,
  Globe,
  ChevronDown,
} from "lucide-react";
import { useAuth, useTheme } from "../App";
import { alertsApi } from "../lib/api";

const NAV_ITEMS = [
  { key: "nav.dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { key: "nav.cases", href: "/cases", Icon: FolderOpen },
  { key: "nav.causeList", href: "/cause-list", Icon: List },
  { key: "nav.documents", href: "/cases", Icon: FileText, subHref: true },
  { key: "nav.research", href: "/research", Icon: Search },
  { key: "nav.alerts", href: "/alerts", Icon: Bell },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout, isDemo } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    alertsApi.count().then((r) => setUnreadAlerts(r.unread)).catch(() => {});
    const interval = setInterval(() => {
      alertsApi.count().then((r) => setUnreadAlerts(r.unread)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const switchLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    setLangOpen(false);
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { judge: t("auth.roleJudge"), lawyer: t("auth.roleLawyer"), clerk: t("auth.roleClerk") };
    return map[role] || role;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Scale className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-lg font-bold text-foreground leading-none">{t("appName")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("appSubtitle")}</p>
        </div>
      </div>

      {isDemo && (
        <div className="mx-3 mt-3 px-3 py-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">🎭 Demo Mode Active</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ key, href, Icon }) => (
          <NavLink
            key={key}
            to={href}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{t(key)}</span>
            {key === "nav.alerts" && unreadAlerts > 0 && (
              <span className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                {unreadAlerts > 9 ? "9+" : unreadAlerts}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-border space-y-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/60">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-sm font-semibold">
              {user?.full_name?.charAt(0) || "U"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground">{roleLabel(user?.role || "")}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <LogOut className="w-4 h-4" />
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-card border-r border-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-card border-r border-border shadow-xl animate-slide-in">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-accent text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card/80 backdrop-blur flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-md hover:bg-accent text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Controls row */}
          <div className="flex items-center gap-1.5">
            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-accent text-muted-foreground text-sm transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{i18n.language === "hi" ? "हिंदी" : "EN"}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 animate-fade-in">
                  <button
                    onClick={() => switchLang("en")}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${i18n.language === "en" ? "text-primary font-medium" : "text-foreground"}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => switchLang("hi")}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors hindi-text ${i18n.language === "hi" ? "text-primary font-medium" : "text-foreground"}`}
                  >
                    हिंदी
                  </button>
                </div>
              )}
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
              aria-label={dark ? t("common.lightMode") : t("common.darkMode")}
              title={dark ? t("common.lightMode") : t("common.darkMode")}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Alerts bell */}
            <NavLink
              to="/alerts"
              className="relative p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadAlerts > 9 ? "9+" : unreadAlerts}
                </span>
              )}
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 min-h-full animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
