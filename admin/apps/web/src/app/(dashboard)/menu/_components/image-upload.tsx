'use client';

import { useRef, useState, useTransition, type DragEvent } from 'react';
import Image from 'next/image';
import { Upload, X, ImagePlus, AlertCircle } from 'lucide-react';
import { uploadMenuImage } from '@/app/actions/menu-actions';

/**
 * Image upload field with drag-drop, preview, and remove.
 * Writes the uploaded URL into a hidden input so the parent form picks it up.
 * Storage: apps/web/public/uploads/menu/{venueId}/{uuid}.{ext} — served at /uploads/menu/...
 */
export function ImageUpload({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const [url, setUrl] = useState<string>(defaultValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('JPG, PNG, or WebP only');
      return;
    }
    const fd = new FormData();
    fd.set('image', file);
    startTransition(async () => {
      const result = await uploadMenuImage(fd);
      if (result.ok) {
        setUrl(result.url);
      } else {
        setError(result.error);
      }
    });
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    // Reset so picking the same file twice still fires onChange
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function clear() {
    setUrl('');
    setError(null);
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div className="relative inline-block group">
          <div className="relative w-40 h-40 rounded-lg overflow-hidden border border-border bg-surface2">
            <Image
              src={url}
              alt="Menu item preview"
              fill
              sizes="160px"
              className="object-cover"
            />
          </div>
          <button
            type="button"
            onClick={clear}
            aria-label="Remove image"
            title="Remove image"
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-ink text-bg flex items-center justify-center shadow-md hover:bg-red transition-colors"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-ink/80 text-bg text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Upload size={11} strokeWidth={2.5} />
            Replace
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPickFile}
            className="hidden"
          />
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          className={[
            'w-40 h-40 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors',
            dragging
              ? 'border-terra bg-terraSoft/40'
              : 'border-border bg-surface2 hover:border-terra/50 hover:bg-terraSoft/20',
          ].join(' ')}
        >
          {pending ? (
            <>
              <Upload size={20} className="text-terra animate-pulse" strokeWidth={1.75} />
              <p className="text-xs text-muted">Uploading…</p>
            </>
          ) : (
            <>
              <ImagePlus size={22} className="text-muted" strokeWidth={1.5} />
              <p className="text-xs text-text font-medium">Add photo</p>
              <p className="text-[10px] text-muted px-2 text-center leading-tight">
                Click or drop a file
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPickFile}
            className="hidden"
          />
        </div>
      )}

      {error ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-red">
          <AlertCircle size={12} />
          {error}
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-muted">JPG, PNG, or WebP · max 5MB</p>
      )}
    </div>
  );
}
