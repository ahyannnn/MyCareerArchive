"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FileArchive,
  FileImage,
  FileText,
  FileUp,
  File as FileIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { evidenceApi, type EvidenceItem } from "@/lib/api-client";
import { useInvalidateVault } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function formatBytes(size: number | null): string {
  if (size === null || size === undefined) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(mime: string | null) {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf" || mime.startsWith("text/")) return FileText;
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("gzip") || mime.includes("7z"))
    return FileArchive;
  return FileIcon;
}

function StatusBadge({ status }: { status: EvidenceItem["status"] }) {
  if (status === "UPLOADED") return <Badge variant="success">Uploaded</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="warning">Pending</Badge>;
}

interface PendingUpload {
  key: string;
  fileName: string;
  phase: string;
  error?: string;
}

// Presigned preview URLs (1h TTL server-side); refetch past 50 min instead
// of rendering an expired image.
const previewUrlCache = new Map<string, { url: string; at: number }>();
const PREVIEW_CACHE_MS = 50 * 60_000;

function isPreviewable(item: EvidenceItem): boolean {
  return item.status === "UPLOADED" && (item.mimeType?.startsWith("image/") ?? false);
}

function PreviewThumb({
  item,
  onOpen,
}: {
  item: EvidenceItem;
  onOpen: (item: EvidenceItem, url: string) => void;
}) {
  const cached = previewUrlCache.get(item.id);
  const fresh = cached && Date.now() - cached.at < PREVIEW_CACHE_MS ? cached.url : null;
  const [url, setUrl] = useState<string | null>(fresh);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (fresh) return;
    let cancelled = false;
    evidenceApi
      .downloadUrl(item.id)
      .then(({ url }) => {
        previewUrlCache.set(item.id, { url, at: Date.now() });
        if (!cancelled) setUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [item.id, fresh]);

  if (failed || !url) return null;

  return (
    <button
      type="button"
      onClick={() => onOpen(item, url)}
      aria-label={`Preview ${item.fileName}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={item.fileName}
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-full object-cover transition-transform group-hover:scale-[1.02]"
      />
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-6 text-left text-xs font-medium text-white">
        {item.fileName}
      </span>
    </button>
  );
}

export function EvidenceSection({ credentialId }: { credentialId: string }) {
  const invalidateVault = useInvalidateVault();
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [deleting, setDeleting] = useState<EvidenceItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [viewer, setViewer] = useState<{ item: EvidenceItem; url: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await evidenceApi.list(credentialId));
    } catch {
      toast.error("Could not load evidence");
    } finally {
      setLoading(false);
    }
  }, [credentialId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function uploadOne(file: File) {
    const key = `${Date.now()}-${file.name}`;
    const setPhase = (phase: string, error?: string) =>
      setPending((p) => {
        const rest = p.filter((u) => u.key !== key);
        return error ? [...rest, { key, fileName: file.name, phase, error }] : [...rest, { key, fileName: file.name, phase }];
      });
    const drop = () => setPending((p) => p.filter((u) => u.key !== key));

    if (!file.type) {
      setPhase("failed", "Could not detect the file type. Rename the file with a known extension and retry.");
      return;
    }
    try {
      setPhase("Requesting upload URL…");
      const { evidence, uploadUrl } = await evidenceApi.initiate(credentialId, {
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      setPhase("Uploading…");
      const put = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) throw new Error(`Storage upload failed (HTTP ${put.status})`);
      setPhase("Verifying…");
      await evidenceApi.complete(evidence.id);
      drop();
      toast.success(`${file.name} uploaded`);
      invalidateVault();
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setPhase("failed", message);
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    // Sequential: easier to follow, avoids hammering presigned URLs.
    for (const file of list) {
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(file);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function download(item: EvidenceItem) {
    try {
      const { url } = await evidenceApi.downloadUrl(item.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not get a download link");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await evidenceApi.remove(deleting.id);
      toast.success(`${deleting.fileName} deleted`);
      setDeleting(null);
      invalidateVault();
      await refresh();
    } catch {
      toast.error("Could not delete the file");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload evidence files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(e.dataTransfer.files);
        }}
        className={`block w-full cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-primary bg-accent" : "border-input hover:bg-accent/50"
        }`}
      >
        <Upload className="mx-auto size-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-2 text-sm font-semibold">Drop files here or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Images, PDFs, office docs, text, archives. Size limits apply.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
        }}
      />

      {pending.map((u) => (
        <Card key={u.key}>
          <CardContent className="flex items-center gap-3 p-3 text-sm">
            {u.error ? (
              <FileUp className="size-5 shrink-0 text-destructive" />
            ) : (
              <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{u.fileName}</p>
              {u.error ? (
                <p role="alert" className="text-xs text-destructive">
                  {u.error}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{u.phase}</p>
              )}
            </div>
            {u.error && (
              <Button variant="ghost" size="sm" onClick={() => setPending((p) => p.filter((x) => x.key !== u.key))}>
                Dismiss
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {!loading && items.some(isPreviewable) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.filter(isPreviewable).map((item) => (
            <PreviewThumb
              key={item.id}
              item={item}
              onOpen={(opened, url) => setViewer({ item: opened, url })}
            />
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading evidence…</p>
      ) : items.length === 0 && pending.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No evidence yet. Attach the certificate, screenshot, or document behind this credential.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = iconFor(item.mimeType);
            return (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Icon className="size-8 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.fileName}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatBytes(item.fileSize)}
                        {item.mimeType ? ` · ${item.mimeType}` : ""}
                        {item.status === "FAILED" ? " · nothing was uploaded" : ""}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                    {item.status === "UPLOADED" && (
                      <Button variant="ghost" size="icon" aria-label={`Download ${item.fileName}`} onClick={() => download(item)}>
                        <Download />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${item.fileName}`}
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={viewer !== null} onOpenChange={(open) => !open && setViewer(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{viewer?.item.fileName}</DialogTitle>
            <DialogDescription>
              {viewer && (
                <>
                  {formatBytes(viewer.item.fileSize)}
                  {viewer.item.mimeType ? ` · ${viewer.item.mimeType}` : ""}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {viewer && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewer.url}
              alt={viewer.item.fileName}
              className="max-h-[70vh] w-full rounded-md border object-contain"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewer(null)}>
              Close
            </Button>
            {viewer && (
              <Button
                variant="secondary"
                onClick={() => {
                  window.open(viewer.url, "_blank", "noopener,noreferrer");
                }}
              >
                <Download />
                Open full size
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete evidence?</DialogTitle>
            <DialogDescription>
              {deleting && (
                <>
                  <span className="font-medium text-foreground">{deleting.fileName}</span> and its
                  stored file will be permanently removed. This can&apos;t be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleteBusy} onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteBusy} onClick={confirmDelete}>
              {deleteBusy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
