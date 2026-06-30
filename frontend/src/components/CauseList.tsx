import { useTranslation } from "react-i18next";
import { Clock, AlertTriangle, Scale, Printer, Calendar, Users, Timer } from "lucide-react";

interface CauseListEntry {
  case_id: number;
  case_number: string;
  petitioner: string;
  respondent: string;
  ipc_sections: string | null;
  priority: string;
  priority_score: number;
  estimated_duration_minutes: number;
  time_slot: string;
  slot_number: number;
  judge_name: string;
  court_name: string;
  status: string;
}

interface CauseListData {
  date: string;
  court_name: string | null;
  entries: CauseListEntry[];
  total_cases: number;
  total_duration_minutes: number;
  conflicts_detected: number;
}

interface CauseListProps {
  data: CauseListData;
  onCaseClick?: (caseId: number) => void;
}

const PRIORITY_CLASS: Record<string, string> = {
  urgent: "priority-urgent",
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
};

const STATUS_CLASS: Record<string, string> = {
  active: "status-active",
  pending: "status-pending",
  adjourned: "status-adjourned",
  decided: "status-decided",
  disposed: "status-disposed",
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function minutesToHm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function CauseList({ data, onCaseClick }: CauseListProps) {
  const { t } = useTranslation();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-5 h-5 text-primary" />
              <h2 className="font-serif text-xl font-bold text-foreground">{t("causeList.title")}</h2>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(data.date)}
            </p>
            {data.court_name && (
              <p className="text-sm text-muted-foreground mt-0.5">{data.court_name}</p>
            )}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            {t("causeList.printList")}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { icon: Users, label: t("causeList.totalCases"), value: data.total_cases },
            { icon: Timer, label: t("causeList.totalDuration"), value: minutesToHm(data.total_duration_minutes) },
            { icon: Clock, label: "Court Hours", value: "10:30–16:30" },
            {
              icon: AlertTriangle,
              label: t("causeList.conflicts"),
              value: data.conflicts_detected,
              highlight: data.conflicts_detected > 0,
            },
          ].map(({ icon: Icon, label, value, highlight }) => (
            <div
              key={label}
              className={`rounded-xl p-3 border ${
                highlight
                  ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20"
                  : "border-border bg-muted/40"
              }`}
            >
              <Icon className={`w-4 h-4 mb-1.5 ${highlight ? "text-amber-500" : "text-muted-foreground"}`} />
              <p className={`text-lg font-bold leading-none ${highlight ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Conflict Warning */}
        {data.conflicts_detected > 0 && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t("causeList.conflictWarning", { count: data.conflicts_detected })}
            </p>
          </div>
        )}
      </div>

      {/* Cause List Entries */}
      {data.entries.length === 0 ? (
        <div className="rounded-2xl border border-border p-12 text-center bg-card">
          <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">{t("causeList.noHearings")}</h3>
          <p className="text-sm text-muted-foreground">{t("causeList.noHearingsHint")}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full data-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left">{t("causeList.slotNo")}</th>
                  <th className="px-4 py-3 text-left">{t("causeList.time")}</th>
                  <th className="px-4 py-3 text-left">{t("causeList.caseNo")}</th>
                  <th className="px-4 py-3 text-left">{t("causeList.parties")}</th>
                  <th className="px-4 py-3 text-left">{t("causeList.ipc")}</th>
                  <th className="px-4 py-3 text-left">{t("causeList.dur")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.status")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.priority")}</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr
                    key={entry.case_id}
                    onClick={() => onCaseClick?.(entry.case_id)}
                    className={`border-b border-border last:border-0 transition-colors cursor-pointer hover:bg-muted/40 ${
                      entry.priority === "urgent" ? "bg-red-50/30 dark:bg-red-950/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{entry.slot_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {entry.time_slot}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="case-number text-xs">{entry.case_number}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{entry.petitioner}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">vs {entry.respondent}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono text-muted-foreground">{entry.ipc_sections || "—"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-muted-foreground">{entry.estimated_duration_minutes}m</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`status-badge ${STATUS_CLASS[entry.status] || ""}`}>
                        {t(`status.${entry.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`status-badge ${PRIORITY_CLASS[entry.priority] || ""}`}>
                        {entry.priority === "urgent" && <AlertTriangle className="w-3 h-3 mr-0.5" />}
                        {t(`priority.${entry.priority}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {data.entries.map((entry) => (
              <div
                key={entry.case_id}
                onClick={() => onCaseClick?.(entry.case_id)}
                className={`cause-list-slot cursor-pointer ${entry.priority === "urgent" ? "urgent" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{entry.slot_number}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {entry.time_slot}
                      </span>
                      <span className={`status-badge ${PRIORITY_CLASS[entry.priority] || ""}`}>
                        {t(`priority.${entry.priority}`)}
                      </span>
                    </div>
                    <p className="case-number text-xs mb-0.5">{entry.case_number}</p>
                    <p className="text-sm font-medium text-foreground truncate">{entry.petitioner}</p>
                    <p className="text-xs text-muted-foreground">vs {entry.respondent}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {entry.ipc_sections && (
                        <span className="text-xs font-mono text-muted-foreground">IPC: {entry.ipc_sections}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{entry.estimated_duration_minutes} min</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
