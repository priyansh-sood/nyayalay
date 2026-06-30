import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { Upload, FileText, CheckCircle, X, Loader2, AlertCircle } from "lucide-react";
import { documentsApi } from "../lib/api";

interface UploadedFile {
  id: number;
  name: string;
  size: number;
  status: "uploading" | "processing" | "done" | "error";
  summary?: string;
  error?: string;
}

interface UploadZoneProps {
  caseId: number;
  onUploadComplete?: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABELS: Record<string, string> = {
  uploading: "Uploading...",
  processing: "Extracting text & generating AI summary...",
  done: "Done",
  error: "Upload failed",
};

export default function UploadZone({ caseId, onUploadComplete }: UploadZoneProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const processFile = async (file: File) => {
    const tempId = Date.now() + Math.random();
    const entry: UploadedFile = {
      id: tempId,
      name: file.name,
      size: file.size,
      status: "uploading",
    };

    setFiles((prev) => [...prev, entry]);

    try {
      const result = await documentsApi.upload(caseId, file);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === tempId
            ? { ...f, id: result.id, status: "processing", summary: undefined }
            : f
        )
      );

      // Poll for completion (OCR + AI summary happens async)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const text = await documentsApi.getText(result.id);
          if (text.ai_summary || attempts > 20) {
            clearInterval(poll);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === result.id
                  ? { ...f, status: "done", summary: text.ai_summary || "Processing complete." }
                  : f
              )
            );
            onUploadComplete?.();
          }
        } catch {
          clearInterval(poll);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === result.id ? { ...f, status: "done" } : f
            )
          );
          onUploadComplete?.();
        }
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("errors.uploadFailed");
      setFiles((prev) =>
        prev.map((f) =>
          f.id === tempId ? { ...f, status: "error", error: message } : f
        )
      );
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => processFile(file));
    },
    [caseId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/tiff": [".tiff", ".tif"],
      "image/webp": [".webp"],
    },
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (id: number) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/40"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isDragActive ? "bg-primary/20" : "bg-muted"
            }`}
          >
            <Upload
              className={`w-6 h-6 transition-colors ${
                isDragActive ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">
              {isDragActive ? "Drop files here..." : t("documents.dragDrop")}
            </p>
            <p className="text-sm text-muted-foreground">{t("documents.orBrowse")}</p>
          </div>
          <p className="text-xs text-muted-foreground">{t("documents.supportedFormats")}</p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={`rounded-lg border p-3 animate-fade-in ${
                file.status === "error"
                  ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20"
                  : file.status === "done"
                  ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {file.status === "done" ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : file.status === "error" ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : file.status === "processing" ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                      {(file.status === "done" || file.status === "error") && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-0.5 rounded hover:bg-muted transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p
                    className={`text-xs mt-0.5 ${
                      file.status === "error"
                        ? "text-red-600 dark:text-red-400"
                        : file.status === "done"
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {file.status === "error" ? file.error : STATUS_LABELS[file.status]}
                  </p>

                  {/* Progress bar */}
                  {(file.status === "uploading" || file.status === "processing") && (
                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          file.status === "uploading" ? "w-1/3 bg-primary animate-pulse" : "w-2/3 bg-primary animate-pulse"
                        }`}
                      />
                    </div>
                  )}

                  {/* AI Summary Preview */}
                  {file.status === "done" && file.summary && (
                    <div className="mt-2 p-2 rounded-md bg-card border border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {t("documents.aiSummary")}
                      </p>
                      <p className="text-xs text-foreground leading-relaxed line-clamp-3">{file.summary}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
