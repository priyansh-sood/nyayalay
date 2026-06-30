import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Filter, X, Loader2 } from "lucide-react";
import { casesApi } from "../lib/api";
import CaseTable from "../components/CaseTable";
import { format } from "date-fns";

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

const STATUSES = ["", "pending", "active", "adjourned", "decided", "disposed"];
const PRIORITIES = ["", "urgent", "high", "medium", "low"];

interface CaseFormData {
  case_number: string;
  court_name: string;
  judge_name: string;
  petitioner: string;
  respondent: string;
  status: string;
  filing_date: string;
  next_date: string;
  ipc_sections: string;
  priority_score: number;
  priority: string;
  description: string;
  estimated_duration_minutes: number;
}

const EMPTY_FORM: CaseFormData = {
  case_number: "",
  court_name: "",
  judge_name: "",
  petitioner: "",
  respondent: "",
  status: "pending",
  filing_date: format(new Date(), "yyyy-MM-dd"),
  next_date: "",
  ipc_sections: "",
  priority_score: 50,
  priority: "medium",
  description: "",
  estimated_duration_minutes: 30,
};

export default function Cases() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCase, setEditCase] = useState<Case | null>(null);
  const [formData, setFormData] = useState<CaseFormData>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get("priority") || "");
  const PAGE_SIZE = 15;

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await casesApi.list(params);
      setCases(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter]);

  useEffect(() => { loadCases(); }, [loadCases]);

  const openCreate = () => {
    setEditCase(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (c: Case) => {
    setEditCase(c);
    setFormData({
      case_number: c.case_number,
      court_name: c.court_name,
      judge_name: c.judge_name,
      petitioner: c.petitioner,
      respondent: c.respondent,
      status: c.status,
      filing_date: format(new Date(c.filing_date), "yyyy-MM-dd"),
      next_date: c.next_date ? format(new Date(c.next_date), "yyyy-MM-dd") : "",
      ipc_sections: c.ipc_sections || "",
      priority_score: c.priority_score,
      priority: c.priority,
      description: c.description || "",
      estimated_duration_minutes: c.estimated_duration_minutes,
    });
    setFormError("");
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await casesApi.delete(id);
      loadCases();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      const payload = {
        ...formData,
        filing_date: new Date(formData.filing_date).toISOString(),
        next_date: formData.next_date ? new Date(formData.next_date).toISOString() : null,
        ipc_sections: formData.ipc_sections || null,
      };
      if (editCase) {
        await casesApi.update(editCase.id, payload);
      } else {
        await casesApi.create(payload);
      }
      setShowModal(false);
      loadCases();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setFormError(detail || t("common.error"));
    } finally {
      setFormLoading(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="court-header text-2xl font-bold text-foreground">{t("cases.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} {total === 1 ? "case" : "cases"} found
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("cases.newCase")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("cases.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition appearance-none cursor-pointer"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s ? t(`status.${s}`) : t("cases.filterStatus")}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition appearance-none cursor-pointer"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p ? t(`priority.${p}`) : t("cases.filterPriority")}</option>
            ))}
          </select>
        </div>

        {(search || statusFilter || priorityFilter) && (
          <button
            onClick={() => { setSearch(""); setStatusFilter(""); setPriorityFilter(""); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            {t("common.clear")}
          </button>
        )}
      </div>

      {/* Case Table */}
      <CaseTable cases={cases} onDelete={handleDelete} onEdit={openEdit} loading={loading} />

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <button
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in my-8">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-serif font-bold text-lg text-foreground">
                {editCase ? t("cases.editCase") : t("cases.newCase")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t("cases.caseNumber")}>
                  <input required value={formData.case_number} onChange={(e) => setFormData((f) => ({ ...f, case_number: e.target.value }))} placeholder="Sessions Case No. 45/2024" className={inputCls} />
                </Field>
                <Field label={t("cases.status")}>
                  <select value={formData.status} onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                    {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                  </select>
                </Field>
              </div>

              <Field label={t("cases.courtName")}>
                <input required value={formData.court_name} onChange={(e) => setFormData((f) => ({ ...f, court_name: e.target.value }))} placeholder="Additional Sessions Court, Saket, New Delhi" className={inputCls} />
              </Field>

              <Field label={t("cases.judgeName")}>
                <input required value={formData.judge_name} onChange={(e) => setFormData((f) => ({ ...f, judge_name: e.target.value }))} placeholder="Hon'ble Justice ..." className={inputCls} />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t("cases.petitioner")}>
                  <input required value={formData.petitioner} onChange={(e) => setFormData((f) => ({ ...f, petitioner: e.target.value }))} placeholder="State / Complainant name" className={inputCls} />
                </Field>
                <Field label={t("cases.respondent")}>
                  <input required value={formData.respondent} onChange={(e) => setFormData((f) => ({ ...f, respondent: e.target.value }))} placeholder="Accused / Defendant name" className={inputCls} />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t("cases.filingDate")}>
                  <input type="date" required value={formData.filing_date} onChange={(e) => setFormData((f) => ({ ...f, filing_date: e.target.value }))} className={inputCls} />
                </Field>
                <Field label={t("cases.nextDate")}>
                  <input type="date" value={formData.next_date} onChange={(e) => setFormData((f) => ({ ...f, next_date: e.target.value }))} className={inputCls} />
                </Field>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Field label={t("cases.ipcSections")}>
                  <input value={formData.ipc_sections} onChange={(e) => setFormData((f) => ({ ...f, ipc_sections: e.target.value }))} placeholder="302, 34, 120B" className={inputCls} />
                </Field>
                <Field label={t("cases.priority")}>
                  <select value={formData.priority} onChange={(e) => setFormData((f) => ({ ...f, priority: e.target.value }))} className={inputCls}>
                    {PRIORITIES.filter(Boolean).map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
                  </select>
                </Field>
                <Field label={t("cases.duration")}>
                  <input type="number" min="5" max="300" value={formData.estimated_duration_minutes} onChange={(e) => setFormData((f) => ({ ...f, estimated_duration_minutes: Number(e.target.value) }))} className={inputCls} />
                </Field>
              </div>

              <Field label={t("cases.priorityScore")}>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="100" step="1" value={formData.priority_score} onChange={(e) => setFormData((f) => ({ ...f, priority_score: Number(e.target.value) }))} className="flex-1 accent-primary" />
                  <span className="text-sm font-mono font-bold text-primary w-10 text-right">{formData.priority_score}</span>
                </div>
              </Field>

              <Field label={t("cases.description")}>
                <textarea rows={3} value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description of the case..." className={`${inputCls} resize-none`} />
              </Field>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={formLoading} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t("common.save")}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
