import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Loader2, Calendar, RefreshCw } from "lucide-react";
import { causeListApi } from "../lib/api";
import CauseList from "../components/CauseList";
import { format } from "date-fns";

interface CauseListData {
  date: string;
  court_name: string | null;
  entries: unknown[];
  total_cases: number;
  total_duration_minutes: number;
  conflicts_detected: number;
}

export default function CauseListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<CauseListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [courtFilter, setCourtFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const result = await causeListApi.get(selectedDate, courtFilter || undefined);
      setData(result as CauseListData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedDate, courtFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="court-header text-2xl font-bold text-foreground">{t("causeList.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("causeList.subtitle")}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>

        <input
          value={courtFilter}
          onChange={(e) => setCourtFilter(e.target.value)}
          placeholder="Filter by court name..."
          className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition min-w-[200px]"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : data ? (
        <CauseList
          data={data as never}
          onCaseClick={(caseId) => navigate(`/cases/${caseId}`)}
        />
      ) : (
        <div className="text-center py-24">
          <p className="text-muted-foreground">{t("causeList.noHearings")}</p>
        </div>
      )}
    </div>
  );
}
