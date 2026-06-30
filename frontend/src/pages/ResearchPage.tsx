import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search, Loader2, Scale, BookOpen, ChevronDown,
  ChevronUp, Sparkles, ExternalLink, Hash
} from "lucide-react";
import { researchApi, casesApi } from "../lib/api";

interface Source {
  filename: string;
  score: number;
  snippet: string;
  doc_id: number | null;
}

interface ResearchResult {
  answer: string;
  sources: Source[];
  query: string;
}

const SAMPLE_QUERIES = [
  "What are the essential elements to prove murder under IPC Section 302?",
  "Explain common intention under IPC Section 34 with case law",
  "What constitutes criminal conspiracy under Section 120B IPC?",
  "Bail conditions in cases involving IPC Section 307",
  "Landmark judgments on dowry death under Section 304B",
  "Difference between IPC 302 and 304 – culpable homicide vs murder",
];

function SourceCard({ source, index }: { source: Source; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(source.score * 100);

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">{index + 1}</span>
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{source.filename}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{pct}% match</span>
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && source.snippet && (
        <div className="px-3 pb-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground leading-relaxed mt-2 font-mono whitespace-pre-wrap">
            {source.snippet}
          </p>
        </div>
      )}
    </div>
  );
}

function AnswerBlock({ text }: { text: string }) {
  // Render markdown-lite: bold, bullets, newlines
  const parts = text.split("\n");
  return (
    <div className="space-y-2 text-sm text-foreground leading-relaxed">
      {parts.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Bold text **...**
        const rendered = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-primary mt-1 flex-shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: rendered.replace(/^[•\-*]\s/, "") }} />
            </div>
          );
        }

        if (/^\d+\./.test(line)) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs mt-0.5 flex-shrink-0 w-5">{line.match(/^\d+/)?.[0]}.</span>
              <span dangerouslySetInnerHTML={{ __html: rendered.replace(/^\d+\.\s*/, "") }} />
            </div>
          );
        }

        if (line.startsWith("#")) {
          const level = (line.match(/^#+/) || [""])[0].length;
          const content = line.replace(/^#+\s*/, "");
          return (
            <p
              key={i}
              className={level <= 2 ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          );
        }

        return <p key={i} dangerouslySetInnerHTML={{ __html: rendered }} />;
      })}
    </div>
  );
}

export default function ResearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<ResearchResult[]>([]);
  const [cases, setCases] = useState<{ id: number; case_number: string }[]>([]);
  const [selectedCase, setSelectedCase] = useState<number | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    casesApi.list({ size: 50 }).then((d) => {
      setCases(d.items.map((c: { id: number; case_number: string }) => ({ id: c.id, case_number: c.case_number })));
    }).catch(() => {});
  }, []);

  const handleSearch = async (q?: string) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;

    setLoading(true);
    setError("");
    try {
      const data = await researchApi.query(finalQuery, selectedCase, 5);
      setResult(data);
      if (data.answer) {
        setHistory((h) => [data, ...h.slice(0, 4)]);
      }
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(t("common.error") + ". Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="court-header text-2xl font-bold text-foreground">{t("research.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("research.subtitle")}</p>
      </div>

      {/* Search Box */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("research.queryPlaceholder")}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition resize-none pr-12"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Case filter */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCase ?? ""}
              onChange={(e) => setSelectedCase(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring transition"
            >
              <option value="">Search across all cases</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.case_number}</option>
              ))}
            </select>

            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {loading ? t("research.searching") : t("research.searchBtn")}
            </button>
          </div>

          {/* Sample queries */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Sample queries:</p>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuery(q); handleSearch(q); }}
                  className="px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent transition-colors"
                >
                  {q.length > 50 ? q.slice(0, 50) + "…" : q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div ref={resultRef} className="space-y-4 animate-fade-in">
          {/* Query recap */}
          <div className="flex items-center gap-2 px-1">
            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground italic">{result.query}</p>
          </div>

          {/* Answer */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{t("research.answer")}</h3>
            </div>
            <AnswerBlock text={result.answer} />
          </div>

          {/* Sources */}
          {result.sources.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">
                  {t("research.sources")} ({result.sources.length})
                </h3>
              </div>
              <div className="space-y-2">
                {result.sources.map((source, i) => (
                  <SourceCard key={i} source={source} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Research history */}
      {history.length > 1 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-3">Recent Queries</h3>
          <div className="space-y-1.5">
            {history.slice(1).map((h, i) => (
              <button
                key={i}
                onClick={() => { setQuery(h.query); setResult(h); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <Search className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{h.query}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Legal Precedents Panel */}
      {!result && !loading && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">{t("research.precedents")}</h3>
          </div>
          <div className="space-y-3">
            {[
              {
                case: "Bachan Singh v. State of Punjab (1980)",
                ipc: "IPC §302",
                summary: "Established the 'rarest of rare' doctrine for capital punishment in murder cases.",
              },
              {
                case: "State of Maharashtra v. Chandraprakash Jain (1990)",
                ipc: "IPC §376",
                summary: "Prosecutrix testimony alone can sustain conviction without corroboration if credible.",
              },
              {
                case: "Mohd. Ajmal Kasab v. State of Maharashtra (2012)",
                ipc: "IPC §302, 120B, 34",
                summary: "Common intention under §34 can be formed at spur of moment before the act.",
              },
              {
                case: "K.M. Nanavati v. State of Maharashtra (1961)",
                ipc: "IPC §302",
                summary: "Provocation must be grave and sudden; no time to cool down test for exception.",
              },
            ].map((p) => (
              <div
                key={p.case}
                onClick={() => { setQuery(`Explain the judgment in ${p.case} and its significance`); }}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-all cursor-pointer group"
              >
                <span className="flex-shrink-0 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-semibold mt-0.5">
                  {p.ipc}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {p.case}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.summary}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
