import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X, CheckCheck } from "lucide-react";
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

interface AlertBannerProps {
  limit?: number;
  compact?: boolean;
}

export default function AlertBanner({ limit = 5, compact = false }: AlertBannerProps) {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const fetchAlerts = async () => {
    try {
      const data = await alertsApi.list(true); // unread only
      setAlerts(data.slice(0, limit));
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleDismiss = async (id: number) => {
    setDismissed((prev) => new Set([...prev, id]));
    try {
      await alertsApi.markRead(id);
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      setAlerts([]);
    } catch {
      // ignore
    }
  };

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (loading || visibleAlerts.length === 0) return null;

  const isUrgent = (a: Alert) => a.alert_type === "deadline" && a.deadline_date
    ? new Date(a.deadline_date).getTime() - Date.now() < 2 * 86400000
    : a.alert_type === "urgent_priority";

  return (
    <div className="space-y-2 mb-6">
      {!compact && visibleAlerts.length > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {t("alerts.unreadCount", { count: visibleAlerts.length })}
          </p>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t("alerts.markAllRead")}
          </button>
        </div>
      )}

      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 p-3 rounded-lg border animate-fade-in ${
            isUrgent(alert)
              ? "alert-urgent"
              : "alert-warning"
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              isUrgent(alert) ? "text-red-500" : "text-amber-500"
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-snug">{alert.message}</p>
            {alert.deadline_date && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(alert.deadline_date), "dd MMM yyyy")}
              </p>
            )}
          </div>
          <button
            onClick={() => handleDismiss(alert.id)}
            className="flex-shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
