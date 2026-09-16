import { useEffect, useState } from 'react';
import { FileText, Download, Check, X, Trash2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge, type StatusBucket } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { isAdmin } from '@/lib/roles';
import { ApiError } from '@/lib/api';
import {
  listDocuments,
  downloadDocument,
  verifyDocument,
  deleteDocument,
  replaceDocument,
  type DocumentEntityType,
  type DocumentRecord,
  type DocumentVerificationStatus,
} from '@/lib/documentsApi';

const bucketByStatus: Record<DocumentVerificationStatus, StatusBucket> = {
  PENDING: 'pending',
  VERIFIED: 'positive',
  REJECTED: 'negative',
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  entityType: DocumentEntityType;
  entityId: string;
}

export function DocumentsPanel({ entityType, entityId }: Props) {
  const { showToast } = useToast();
  const { currentUser } = useApp();
  const admin = isAdmin(currentUser?.roles);

  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<DocumentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteModal, setDeleteModal] = useState<DocumentRecord | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listDocuments(entityType, entityId)
      .then(setDocs)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load documents.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [entityType, entityId]);

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      await downloadDocument(doc.id, doc.fileName);
    } catch (err) {
      showToast(
        'error',
        err instanceof ApiError && err.status === 404
          ? "This document's file could not be found — it may need to be re-uploaded."
          : err instanceof ApiError
            ? err.message
            : 'Failed to download document.',
      );
    }
  };

  const handleVerify = async (doc: DocumentRecord) => {
    setBusyId(doc.id);
    try {
      await verifyDocument(doc.id, true);
      showToast('success', 'Document verified.');
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to verify document.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setBusyId(rejectModal.id);
    try {
      await verifyDocument(rejectModal.id, false, rejectReason);
      showToast('success', 'Document rejected.');
      setRejectModal(null);
      setRejectReason('');
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to reject document.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setBusyId(deleteModal.id);
    try {
      await deleteDocument(deleteModal.id);
      showToast('success', 'Document deleted.');
      setDeleteModal(null);
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to delete document.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReplace = async (doc: DocumentRecord, file: File | undefined) => {
    if (!file) return;
    setBusyId(doc.id);
    try {
      await replaceDocument(doc.id, file);
      showToast('success', 'Document replaced. The replacement will need to be re-verified.');
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to replace document.');
    } finally {
      setBusyId(null);
      setReplaceTargetId(null);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-ink mb-4">Documents</h2>
      {loading ? (
        <p className="text-sm text-ink-secondary">Loading...</p>
      ) : error ? (
        <EmptyState title="Couldn't load documents" message={error} icon={<FileText className="h-8 w-8" />} />
      ) : docs.length === 0 ? (
        <EmptyState title="No documents uploaded for this record yet" message="" icon={<FileText className="h-8 w-8" />} />
      ) : (
        <div className="divide-y divide-brand-50">
          {docs.map((doc) => (
            <div key={doc.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-ink truncate">{doc.fileName}</span>
                  <StatusBadge bucket={bucketByStatus[doc.verificationStatus]} label={doc.verificationStatus} />
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">
                  {doc.documentType} · Uploaded {formatDate(doc.uploadedAt)}
                  {doc.rejectionReason && ` · Rejected: ${doc.rejectionReason}`}
                  {doc.replacesDocumentId && ' · Replaces a previous version'}
                  {doc.supersededByDocumentId && ' · Superseded by a newer version'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)}>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
                {admin && !doc.deletedAt && (
                  <>
                    {doc.verificationStatus === 'PENDING' && (
                      <>
                        <Button size="sm" variant="secondary" disabled={busyId === doc.id} onClick={() => handleVerify(doc)}>
                          <Check className="h-3.5 w-3.5" />
                          Verify
                        </Button>
                        <Button size="sm" variant="danger" disabled={busyId === doc.id} onClick={() => setRejectModal(doc)}>
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </>
                    )}
                    <label className="inline-flex">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleReplace(doc, e.target.files?.[0])}
                        onClick={() => setReplaceTargetId(doc.id)}
                      />
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-brand-50 hover:text-brand-700 cursor-pointer transition-colors ${busyId === doc.id && replaceTargetId === doc.id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Replace
                      </span>
                    </label>
                    <Button size="sm" variant="danger" disabled={busyId === doc.id} onClick={() => setDeleteModal(doc)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!rejectModal}
        onClose={() => {
          setRejectModal(null);
          setRejectReason('');
        }}
        title="Reject Document"
        primaryLabel="Reject"
        primaryVariant="danger"
        primaryDisabled={!rejectReason.trim()}
        onPrimary={handleReject}
      >
        <Textarea
          label="Reason"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          error={!rejectReason.trim() ? 'A reason is required to reject a document.' : undefined}
        />
      </Modal>

      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Document"
        description="This document will be marked deleted — the file is retained for audit but hidden from normal views."
        primaryLabel="Delete"
        primaryVariant="danger"
        onPrimary={handleDelete}
      >
        <div />
      </Modal>
    </Card>
  );
}
