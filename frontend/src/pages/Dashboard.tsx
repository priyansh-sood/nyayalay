import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  FolderOpen, Scale, Clock, CheckCircle, AlertTriangle,
  Plus, Upload, Bell, Search, TrendingUp, Calendar
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { casesApi, alertsApi } from "../lib/api";
import { useAuth } from "../App";
import AlertBanner from "../components/AlertBanner";
import CaseTable from "../components/CaseTable";
import { format } from "date-fns";

interface Stats {
  total: number;
  active: number;
  pending: number;
  decided: number;
  upcoming_7_days: number;
}

const CHART_COLORS = ["#22c55e", "#f59e0b", "#14b8a6", "#6b7280", "#ef4444"];

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCases, setRecentCases] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, cases] = await Promise.all([
          casesApi.stats(),
          casesApi.list({ size: 5, page: 1 }),
        ]);
        setStats(s);
        setRecentCases(cases.items);
      } catch (err) {
        console.error("Dashboard load error", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pieData = stats
    ? [
        { name: t("status.active"), value: stats.active },
        { name: t("status.pending"), value: stats.pending },
        { name: t("status.decided"), value: stats.decided },
        { name: t("status.disposed"), value: Math.max(0, stats.total - stats.active - stats.pending - stats.decided) },
      ].filter((d) => d.value > 0)
    : [];

  const barData = stats
    ? [
        { name: t("status.active"), value: stats.active, fill: "#22c55e" },
        { name: t("status.pending"), value: stats.pending, fill: "#f59e0b" },
        { name: t("status.decided"), value: stats.decided, fill: "#14b8a6" },
        { name: t("dashboard.upcomingWeek"), value: stats.upcoming_7_days, fill: "#ef4444" },
      ]
    : [];

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    value: number | string | undefined;
    color: string;
    onClick?: () => void;
  }) => (
    <div
      onClick={onClick}
      className={`bg-card rounded-2xl border border-border p-5 card-hover ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {loading ? (
              <span className="inline-block w-12 h-8 bg-muted rounded animate-pulse" />
            ) : (
              value ?? "—"
            )}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickAction = ({
    icon: Icon,
    label,
    href,
    color,
  }: {
    icon: React.ElementType;
    label: string;
    href: string;
    color: string;
  }) => (
    <button
      onClick={() => navigate(href)}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-accent transition-all duration-200 text-center group"
    >
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="court-header text-2xl font-bold text-foreground">
            {t("dashboard.welcomeBack")}, {user?.full_name?.split(" ").slice(-1)[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(), "EEEE, dd MMMM yyyy")}
          </p>
        </div>
        <button
          onClick={() => navigate("/cases")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("dashboard.addCase")}
        </button>
      </div>

      {/* Deadline Alerts Banner */}
      <AlertBanner limit={3} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FolderOpen}
          label={t("dashboard.totalCases")}
          value={stats?.total}
          color="bg-primary"
          onClick={() => navigate("/cases")}
        />
        <StatCard
          icon={Scale}
          label={t("dashboard.activeCases")}
          value={stats?.active}
          color="bg-green-500"
          onClick={() => navigate("/cases?status=active")}
        />
        <StatCard
          icon={Clock}
          label={t("dashboard.pendingCases")}
          value={stats?.pending}
          color="bg-amber-500"
          onClick={() => navigate("/cases?status=pending")}
        />
        <StatCard
          icon={AlertTriangle}
          label={t("dashboard.upcomingWeek")}
          value={stats?.upcoming_7_days}
          color="bg-red-500"
          onClick={() => navigate("/alerts")}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Case Distribution</h3>
          </div>
          {loading ? (
            <div className="h-48 bg-muted/40 rounded-xl animate-pulse" />
          ) : pieData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {pieData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data available</div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Case Status Overview</h3>
          </div>
          {loading ? (
            <div className="h-48 bg-muted/40 rounded-xl animate-pulse" />
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">{t("dashboard.quickActions")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={Plus} label={t("dashboard.addCase")} href="/cases" color="bg-primary" />
          <QuickAction icon={Upload} label={t("dashboard.uploadDoc")} href="/cases" color="bg-indigo-500" />
          <QuickAction icon={Bell} label={t("dashboard.viewAlerts")} href="/alerts" color="bg-red-500" />
          <QuickAction icon={Search} label={t("dashboard.research")} href="/research" color="bg-teal-500" />
        </div>
      </div>

      {/* Recent Cases */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">{t("dashboard.recentCases")}</h3>
          <button
            onClick={() => navigate("/cases")}
            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            {t("common.view")} all →
          </button>
        </div>
        <CaseTable cases={recentCases as never} loading={loading} />
      </div>
    </div>
  );
}
