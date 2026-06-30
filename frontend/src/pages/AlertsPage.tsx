import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Bell, CheckCheck, CheckCircle,
  Loader2, Clock, Scale
} from "lucide-react";
import { alertsApi } from "../lib/api";
import { format } from "date-fns";

interface Alert {
  id: number;
  case_id: number;
  alert_type: string;
  message: string;
  is_read: boolean;
  triggered_at: string;
  deadline_date: string | null;
  case_number: string | null;
  petitioner: string | null;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgClass: string }> = {
  deadline: { icon: Clock, color: "text-amber-500", bgClass: "alert-warning" },
  urgent_priority: { icon: AlertTriangle, color: "text-red-500", bgClass: "alert-urgent" },
  hearing: { icon: Scale, color: "text-blue-500", bgClass: "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20" },
};

export default function AlertsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await alertsApi.list(unreadOnly);
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [unreadOnly]);

  const handleMarkRead = async (id: number) => {
    try {
      await alertsApi.markRead(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="court-header text-2xl font-bold text-foreground">{t("alerts.title")}</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("alerts.unreadCount", { count: unreadCount })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded accent-primary"
            />
            Unread only
          </label>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {t("alerts.markAllRead")}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-border p-16 text-center bg-card">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">{t("alerts.noAlerts")}</h3>
          <p className="text-sm text-muted-foreground">{t("alerts.noAlertsHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const cfg = TYPE_CONFIG[alert.alert_type] || TYPE_CONFIG.hearing;
            const Icon = cfg.icon;

            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 transition-all ${cfg.bgClass} ${
                  alert.is_read ? "opacity-60" : ""
                } animate-fade-in`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.color}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {alert.case_number && (
                          <p
                            className="text-xs font-mono text-primary font-medium mb-0.5 cursor-pointer hover:underline"
                            onClick={() => navigate(`/cases/${alert.case_id}`)}
                          >
                            {alert.case_number}
                          </p>
                        )}
                        <p className="text-sm text-foreground leading-relaxed">{alert.message}</p>
                      </div>

                      {!alert.is_read && (
                        <button
                          onClick={() => handleMarkRead(alert.id)}
                          className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border border-border hover:bg-background transition-colors"
                        >
                          {t("alerts.markRead")}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(alert.triggered_at), "dd MMM yyyy, HH:mm")}
                      </p>
                      {alert.deadline_date && (
                        <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(alert.deadline_date), "dd MMM yyyy")}
                        </p>
                      )}
                      {alert.is_read && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
