import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { casesApi, documentsApi } from "../lib/api";
import CaseDetail from "../components/CaseDetail";

export default function CaseView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [caseData, setCaseData] = useState<unknown>(null);
  const [documents, setDocuments] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const caseId = Number(id);

  const load = async () => {
    setLoading(true);
    try {
      const [c, docs] = await Promise.all([
        casesApi.get(caseId),
        casesApi.documents(caseId),
      ]);
      setCaseData(c);
      setDocuments(docs);
    } catch {
      setError(t("errors.notFound"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [caseId]);

  const handleDelete = async () => {
    try {
      await casesApi.delete(caseId);
      navigate("/cases");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    try {
      await documentsApi.delete(docId);
      setDocuments((docs) => docs.filter((d: unknown) => (d as { id: number }).id !== docId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="text-center py-24">
        <p className="text-destructive font-semibold mb-3">{error || t("errors.notFound")}</p>
        <button onClick={() => navigate("/cases")} className="text-sm text-primary hover:underline">
          ← {t("common.back")} to Cases
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <CaseDetail
        caseData={caseData as never}
        documents={documents as never}
        onDelete={handleDelete}
        onEdit={() => navigate("/cases")}
        onUpload={() => navigate(`/cases/${caseId}/upload`)}
        onDeleteDoc={handleDeleteDoc}
      />
    </div>
  );
}
