import { useState, useRef, useEffect } from "react";
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle, FolderOpen, RefreshCw } from "lucide-react";
import { DocumentResponse, UploadedFileInfo } from "@/lib/api";
import { apiService } from "@/lib/api";

interface UploadedFile {
  id: string;
  name: string;
  chunks: number;
  status: "success" | "error" | "duplicate";
  error?: string;
}

interface UploadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadDocument: (file: File, sourceLabel?: string) => Promise<DocumentResponse>;
  onAddText: (text: string, sourceLabel?: string) => Promise<DocumentResponse>;
  isApiAvailable: boolean | null;
}

export function UploadPanel({ isOpen, onClose, onUploadDocument, onAddText, isApiAvailable }: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [persistedFiles, setPersistedFiles] = useState<UploadedFileInfo[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [textLabel, setTextLabel] = useState("");
  const [isAddingText, setIsAddingText] = useState(false);
  const [activeTab, setActiveTab] = useState<"files" | "text">("files");
  const [dragActive, setDragActive] = useState(false);

  // Fetch persisted uploads every time the panel opens
  useEffect(() => {
    if (isOpen && isApiAvailable) {
      fetchPersistedFiles();
    }
  }, [isOpen, isApiAvailable]);

  const fetchPersistedFiles = async () => {
    setIsFetchingFiles(true);
    try {
      const data = await apiService.listUploads();
      setPersistedFiles(data.files);
    } catch {
      // silently ignore if backend is down
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (const file of Array.from(files)) {
      // Duplicate check against persisted files
      const isDuplicate = persistedFiles.some(
        (pf) => pf.original_filename.toLowerCase() === file.name.toLowerCase()
      );
      if (isDuplicate) {
        setUploadedFiles(prev => [...prev, {
          id: crypto.randomUUID(),
          name: file.name,
          chunks: 0,
          status: "duplicate",
          error: "Already uploaded — duplicate skipped",
        }]);
        continue;
      }
      try {
        const result = await onUploadDocument(file);
        setUploadedFiles(prev => [...prev, {
          id: crypto.randomUUID(),
          name: result.filename,
          chunks: result.chunks_added,
          status: "success"
        }]);
        // Refresh persisted list after successful upload
        fetchPersistedFiles();
      } catch (err) {
        setUploadedFiles(prev => [...prev, {
          id: crypto.randomUUID(),
          name: file.name,
          chunks: 0,
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed"
        }]);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddText = async () => {
    if (!textContent.trim()) return;

    setIsAddingText(true);
    try {
      const result = await onAddText(textContent, textLabel || undefined);
      setUploadedFiles(prev => [...prev, {
        id: crypto.randomUUID(),
        name: textLabel || "Text snippet",
        chunks: result.chunks_added,
        status: "success"
      }]);
      setTextContent("");
      setTextLabel("");
    } catch (err) {
      setUploadedFiles(prev => [...prev, {
        id: crypto.randomUUID(),
        name: textLabel || "Text snippet",
        chunks: 0,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to add text"
      }]);
    }
    setIsAddingText(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-foreground/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[400px] max-w-full bg-card border-l border-border shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Knowledge Base</h2>
              <p className="text-xs text-muted-foreground">Upload PDFs to train the AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* API Status */}
        {isApiAvailable === false && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            Backend not connected. Uploads will fail.
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("files")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "files" 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload Files
          </button>
          <button
            onClick={() => setActiveTab("text")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "text" 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Add Text
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "files" ? (
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  disabled={isUploading}
                />
                <Upload className={`h-12 w-12 mx-auto mb-3 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium mb-1">
                  {dragActive ? "Drop files here" : "Drag & drop PDF files here"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Browse Files"
                  )}
                </button>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported: PDF, DOCX, TXT
                </p>
              </div>

              {/* Info about local storage */}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-600">
                <FolderOpen className="h-4 w-4 inline mr-2" />
                Files are stored in <code className="bg-blue-500/20 px-1 rounded">backend/uploads/</code> and vectorized in Qdrant.
              </div>

              {/* Session upload result notifications */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Session</h3>
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        file.status === "success"
                          ? "bg-green-500/5 border-green-500/20"
                          : file.status === "duplicate"
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-red-500/5 border-red-500/20"
                      }`}
                    >
                      {file.status === "success" ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : file.status === "duplicate" ? (
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.status === "success" ? `${file.chunks} chunks vectorized` : file.error}
                        </p>
                      </div>
                      <button onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))} className="p-1 rounded hover:bg-accent transition-colors">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Persisted files list from backend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Knowledge Base ({persistedFiles.length} files)
                  </h3>
                  <button
                    onClick={fetchPersistedFiles}
                    disabled={isFetchingFiles}
                    className="p-1 rounded hover:bg-accent transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isFetchingFiles ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {isFetchingFiles ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm">Loading files...</span>
                  </div>
                ) : persistedFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No files uploaded yet.</p>
                ) : (
                  persistedFiles.map((file) => (
                    <div key={file.saved_filename} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 border-border">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.original_filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size_bytes / 1024).toFixed(1)} KB · {new Date(file.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Text Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Source Label (optional)</label>
                <input
                  value={textLabel}
                  onChange={(e) => setTextLabel(e.target.value)}
                  placeholder="e.g., Company Policy, FAQ..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste your text content here..."
                  rows={12}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={handleAddText}
                disabled={!textContent.trim() || isAddingText}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isAddingText ? (
                  <>
                    <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 inline mr-2" />
                    Add to Knowledge Base
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
