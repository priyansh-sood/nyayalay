import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Loader2 } from "lucide-react";
import { casesApi } from "../lib/api";
import UploadZone from "../components/UploadZone";

export default function Upload() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [caseData, setCaseData] = useState<{ case_number: string; petitioner: string; respondent: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const caseId = Number(id);

  useEffect(() => {
    casesApi.get(caseId)
      .then((c) => setCaseData(c as never))
      .catch(() => navigate("/cases"))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(`/cases/${caseId}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {t("common.back")} to Case
      </button>

      {/* Header */}
      <div>
        <h1 className="court-header text-2xl font-bold text-foreground">{t("documents.upload")}</h1>
        {caseData && (
          <p className="text-sm text-muted-foreground mt-1">
            {caseData.case_number} — {caseData.petitioner} vs {caseData.respondent}
          </p>
        )}
      </div>

      {/* Info card */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary mb-1">How it works</h3>
        <ol className="space-y-1 text-sm text-muted-foreground">
          <li>1. Upload a PDF or image of the court document</li>
          <li>2. EasyOCR automatically extracts text (supports Hindi + English)</li>
          <li>3. GPT-4o-mini generates a legal summary</li>
          <li>4. Document is indexed in Pinecone for semantic search</li>
        </ol>
      </div>

      {/* Upload Zone */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-semibold text-foreground mb-4">{t("documents.dragDrop")}</h2>
        <UploadZone
          caseId={caseId}
          onUploadComplete={() => {
            // Could show a toast here
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/cases/${caseId}`)}
          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors text-center"
        >
          View Case Documents
        </button>
      </div>
    </div>
  );
}
