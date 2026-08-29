import { useRef, useState } from 'react';
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';

interface FileUploadProps {
  label: string;
  optional?: boolean;
  accept?: string;
  onFileSelected: (file: File | null) => void;
  uploading?: boolean;
  error?: string;
}

/**
 * No shared FileUpload component or /documents upload pattern existed anywhere in
 * this codebase (grepped for it — nothing). Built fresh here for the wizard's
 * document-upload controls; reconcile with a real one if the backend introduces it.
 */
export function FileUpload({ label, optional, accept, onFileSelected, uploading, error }: FileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileName(file?.name ?? null);
    onFileSelected(file);
  };

  const handleClear = () => {
    setFileName(null);
    onFileSelected(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1.5 text-xs font-normal text-ink-secondary">(optional)</span>}
      </label>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" id={`file-${label}`} />
      {fileName ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-2.5">
          <FileText className="h-4 w-4 text-brand-600 shrink-0" />
          <span className="flex-1 min-w-0 truncate text-sm text-ink">{fileName}</span>
          {uploading ? (
            <Loader2 className="h-4 w-4 text-brand-500 animate-spin shrink-0" />
          ) : (
            <button
              type="button"
              onClick={handleClear}
              className="text-ink-secondary hover:text-status-rejected transition-colors shrink-0"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor={`file-${label}`}
          className="flex items-center gap-3 rounded-xl border border-dashed border-brand-200 bg-brand-50/30 px-4 py-2.5 text-sm text-ink-secondary cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all"
        >
          <UploadCloud className="h-4 w-4 shrink-0" />
          Choose a file to upload...
        </label>
      )}
      {error && <p className="text-xs text-status-rejected">{error}</p>}
    </div>
  );
}
