import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Calendar, MapPin, User, FileText, Scale, Clock,
  Upload, Edit2, Trash2, ChevronLeft, AlertTriangle,
  CheckCircle, Hash
} from "lucide-react";
import { format } from "date-fns";

interface CaseData {
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
  description: string | null;
  estimated_duration_minutes: number;
  days_until_next: number | null;
  is_urgent: boolean;
}

interface Document {
  id: number;
  original_filename: string;
  file_size: number;
  mime_type: string;
  ocr_text: string | null;
  ai_summary: string | null;
  pinecone_indexed: boolean;
  uploaded_at: string;
}

interface CaseDetailProps {
  caseData: CaseData;
  documents: Document[];
  onDelete?: () => void;
  onEdit?: () => void;
  onUpload?: () => void;
  onDeleteDoc?: (docId: number) => void;
}

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

type Tab = "overview" | "documents";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CaseDetail({
  caseData,
  documents,
  onDelete,
  onEdit,
  onUpload,
  onDeleteDoc,
}: CaseDetailProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [expandedDoc, setExpandedDoc] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const Field = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
        <div className="text-sm text-foreground">{value || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Back + Actions Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/cases")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("common.back")}
        </button>

        <div className="flex items-center gap-2">
          {onUpload && (
            <button
              onClick={onUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("documents.upload")}</span>
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("common.edit")}</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("common.delete")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="font-semibold text-foreground">{t("cases.deleteCase")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{t("cases.confirmDelete")}</p>
            <p className="text-xs text-muted-foreground mb-5">{t("cases.deleteWarning")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteConfirm(false); onDelete && onDelete(); }}
                className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                {t("cases.deleteCase")}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Header Card */}
      <div className={`rounded-2xl border p-5 ${caseData.is_urgent ? "border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-950/10" : "border-border bg-card"}`}>
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <p className="case-number text-sm">{caseData.case_number}</p>
          <div className="flex gap-2 flex-wrap">
            <span className={`status-badge ${STATUS_CLASS[caseData.status]}`}>{t(`status.${caseData.status}`)}</span>
            <span className={`status-badge ${PRIORITY_CLASS[caseData.priority]}`}>
              {caseData.is_urgent && <AlertTriangle className="w-3 h-3 mr-0.5" />}
              {t(`priority.${caseData.priority}`)}
            </span>
          </div>
        </div>

        <h1 className="court-header text-xl font-bold mb-1">
          {caseData.petitioner}
          <span className="text-muted-foreground font-normal text-base mx-2">vs</span>
          {caseData.respondent}
        </h1>
        <p className="text-sm text-muted-foreground">{caseData.court_name}</p>

        {caseData.days_until_next !== null && caseData.days_until_next <= 7 && (
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            {caseData.days_until_next === 0
              ? t("cases.hearingToday")
              : caseData.days_until_next === 1
              ? t("cases.hearingTomorrow")
              : t("cases.daysUntilHearing", { days: caseData.days_until_next })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {(["overview", "documents"] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t_
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t_ === "overview" ? t("cases.viewCase") : `${t("documents.title")} (${documents.length})`}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-sm text-foreground mb-2">{t("cases.caseNumber")}</h3>
            <div className="divide-y divide-border">
              <Field icon={User} label={t("cases.judgeName")} value={caseData.judge_name} />
              <Field icon={MapPin} label={t("cases.courtName")} value={caseData.court_name} />
              <Field
                icon={Calendar}
                label={t("cases.filingDate")}
                value={format(new Date(caseData.filing_date), "dd MMMM yyyy")}
              />
              <Field
                icon={Calendar}
                label={t("cases.nextDate")}
                value={caseData.next_date ? format(new Date(caseData.next_date), "dd MMMM yyyy") : null}
              />
              <Field
                icon={Clock}
                label={t("cases.duration")}
                value={`${caseData.estimated_duration_minutes} ${t("common.minutes")}`}
              />
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-sm text-foreground mb-2">{t("cases.ipcSections")}</h3>
            <div className="divide-y divide-border">
              <Field
                icon={Hash}
                label={t("cases.ipcSections")}
                value={
                  caseData.ipc_sections ? (
                    <div className="flex flex-wrap gap-1.5">
                      {caseData.ipc_sections.split(",").map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-medium">
                          IPC §{s.trim()}
                        </span>
                      ))}
                    </div>
                  ) : null
                }
              />
              <Field icon={Scale} label={t("cases.priorityScore")} value={`${caseData.priority_score.toFixed(1)} / 100`} />
              {caseData.description && (
                <div className="py-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{t("cases.description")}</p>
                  <p className="text-sm text-foreground leading-relaxed">{caseData.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {tab === "documents" && (
        <div className="space-y-3">
          {documents.length === 0 ? (
            <div className="rounded-xl border border-border p-12 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">{t("documents.noDocuments")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("documents.uploadFirst")}</p>
              {onUpload && (
                <button
                  onClick={onUpload}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors mx-auto"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t("documents.upload")}
                </button>
              )}
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.original_filename}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatBytes(doc.file_size)}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(doc.uploaded_at), "dd MMM yyyy")}</span>
                      {doc.pinecone_indexed ? (
                        <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          {t("documents.indexed")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("documents.notIndexed")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors"
                    >
                      {expandedDoc === doc.id ? t("common.close") : t("common.view")}
                    </button>
                    {onDeleteDoc && (
                      <button
                        onClick={() => onDeleteDoc(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {expandedDoc === doc.id && (
                  <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                    {doc.ai_summary && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5" />
                          {t("documents.aiSummary")}
                        </h4>
                        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-card rounded-lg p-3 border border-border">
                          {doc.ai_summary}
                        </div>
                      </div>
                    )}
                    {doc.ocr_text && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("documents.ocrText")}</h4>
                        <div className="text-xs text-muted-foreground leading-relaxed bg-card rounded-lg p-3 border border-border max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
                          {doc.ocr_text}
                        </div>
                      </div>
                    )}
                    {!doc.ai_summary && !doc.ocr_text && (
                      <p className="text-sm text-muted-foreground italic">{t("documents.processing")}</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
