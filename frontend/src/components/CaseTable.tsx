import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Eye, Edit2, Trash2, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Case {
  id: number;
  case_number: string;
  court_name: string;
  judge_name: string;
  petitioner: string;
  respondent: string;
  status: string;
  filing_date: string;
  next_date: string | null;
  ipc_sections: string | null;
  priority_score: number;
  priority: string;
  days_until_next: number | null;
  is_urgent: boolean;
  estimated_duration_minutes: number;
  description: string | null;
  assigned_user_id: number | null;
}

interface CaseTableProps {
  cases: Case[];
  onDelete?: (id: number) => void;
  onEdit?: (c: Case) => void;
  loading?: boolean;
}

type SortKey = "case_number" | "petitioner" | "status" | "next_date" | "priority_score";

const STATUS_CLASS: Record<string, string> = {
  active: "status-active",
  pending: "status-pending",
  adjourned: "status-adjourned",
  decided: "status-decided",
  disposed: "status-disposed",
};

const PRIORITY_CLASS: Record<string, string> = {
  urgent: "priority-urgent",
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
};

function DaysChip({ days, isUrgent }: { days: number | null; isUrgent: boolean }) {
  const { t } = useTranslation();
  if (days === null) return <span className="text-muted-foreground text-xs">—</span>;
  if (days === 0) return <span className="status-badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t("cases.hearingToday")}</span>;
  if (days === 1) return <span className="status-badge bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{t("cases.hearingTomorrow")}</span>;
  return (
    <span className={`status-badge ${isUrgent ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
      {t("cases.daysUntilHearing", { days })}
    </span>
  );
}

export default function CaseTable({ cases, onDelete, onEdit, loading }: CaseTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("next_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...cases].sort((a, b) => {
    let valA: string | number | null = a[sortKey];
    let valB: string | number | null = b[sortKey];
    if (sortKey === "next_date") {
      valA = a.next_date ? new Date(a.next_date).getTime() : Infinity;
      valB = b.next_date ? new Date(b.next_date).getTime() : Infinity;
    }
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;
    const dir = sortDir === "asc" ? 1 : -1;
    return valA < valB ? -dir : valA > valB ? dir : 0;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  const Th = ({ col, label, className = "" }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/40 h-12 border-b border-border" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-b border-border last:border-0 animate-pulse bg-muted/20" />
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
          <Eye className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">{t("cases.noCases")}</h3>
        <p className="text-sm text-muted-foreground">{t("cases.createFirst")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr className="border-b border-border">
              <Th col="case_number" label={t("cases.caseNumber")} />
              <Th col="petitioner" label={t("cases.petitioner")} className="hidden md:table-cell" />
              <Th col="status" label={t("cases.status")} />
              <Th col="priority_score" label={t("cases.priority")} className="hidden lg:table-cell" />
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden xl:table-cell">
                {t("cases.ipcSections")}
              </th>
              <Th col="next_date" label={t("cases.nextDate")} />
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("common.view")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr
                key={c.id}
                className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer ${
                  c.is_urgent ? "bg-red-50/30 dark:bg-red-950/10" : ""
                }`}
                onClick={() => navigate(`/cases/${c.id}`)}
              >
                <td className="px-3 py-3.5">
                  <div className="flex items-start gap-2">
                    {c.is_urgent && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="case-number text-xs font-mono text-primary leading-tight">{c.case_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 md:hidden">
                        {c.petitioner} <span className="text-muted-foreground/50">vs</span> {c.respondent}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-3.5 hidden md:table-cell">
                  <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{c.petitioner}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">vs {c.respondent}</p>
                </td>

                <td className="px-3 py-3.5">
                  <span className={`status-badge ${STATUS_CLASS[c.status] || "bg-muted text-muted-foreground"}`}>
                    {t(`status.${c.status}`)}
                  </span>
                </td>

                <td className="px-3 py-3.5 hidden lg:table-cell">
                  <span className={`status-badge ${PRIORITY_CLASS[c.priority] || ""}`}>
                    {t(`priority.${c.priority}`)}
                  </span>
                </td>

                <td className="px-3 py-3.5 hidden xl:table-cell">
                  <span className="text-xs font-mono text-muted-foreground">
                    {c.ipc_sections || "—"}
                  </span>
                </td>

                <td className="px-3 py-3.5">
                  <div className="space-y-1">
                    {c.next_date && (
                      <p className="text-xs text-foreground font-medium">
                        {format(new Date(c.next_date), "dd MMM yyyy")}
                      </p>
                    )}
                    <DaysChip days={c.days_until_next} isUrgent={c.is_urgent} />
                  </div>
                </td>

                <td className="px-3 py-3.5">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/cases/${c.id}`)}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title={t("cases.viewCase")}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(c)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title={t("cases.editCase")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <>
                        {deleteConfirm === c.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { onDelete(c.id); setDeleteConfirm(null); }}
                              className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                              {t("common.yes")}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-xs rounded bg-muted text-foreground hover:bg-muted/80 transition-colors"
                            >
                              {t("common.no")}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(c.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors"
                            title={t("cases.deleteCase")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
