import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Building2,
  Scissors,
  Users as UsersIcon,
  User as UserIcon,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  BadgeCheck,
} from 'lucide-react';
import { getFranchisee, verifySection as apiVerifySection, rejectSection as apiRejectSection, ApiError } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { sectionLabels } from '@/utils/stats';
import type { Franchisee, SectionName, SectionState } from '@/types';

type Tab = SectionName;

const tabs: { key: Tab; label: string; icon: typeof UserIcon }[] = [
  { key: 'FRANCHISEE_INFO', label: 'Franchisee Info', icon: UserIcon },
  { key: 'RELATIONS', label: 'Relations', icon: UsersIcon },
  { key: 'FIRMS', label: 'Firms', icon: Building2 },
  { key: 'SALONS', label: 'Salons', icon: Scissors },
];

const relationTypeLabels: Record<string, string> = {
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  PARENT: 'Parent',
  SIBLING: 'Sibling',
  EMERGENCY_CONTACT: 'Emergency Contact',
  OTHER: 'Other',
};

const firmTypeLabels: Record<string, string> = {
  PROPRIETORSHIP: 'Proprietorship',
  PARTNERSHIP: 'Partnership',
  PRIVATE_LIMITED: 'Private Limited',
  LLP: 'LLP',
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function FranchiseeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [franchisee, setFranchisee] = useState<Franchisee | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    getFranchisee(id)
      .then(setFranchisee)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load franchisee.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const [activeTab, setActiveTab] = useState<Tab>('FRANCHISEE_INFO');
  const [rejectModal, setRejectModal] = useState<{ section: SectionName; isReReject: boolean } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [verifyModal, setVerifyModal] = useState<{ section: SectionName } | null>(null);
  const [busy, setBusy] = useState(false);

  const currentSection = useMemo(
    () => franchisee?.sections.find((s) => s.section === activeTab),
    [franchisee, activeTab],
  );

  const allSalons = useMemo(() => {
    if (!franchisee) return [];
    return franchisee.firms.flatMap((firm) =>
      firm.salons.map((sal) => ({ ...sal, firmLegalName: firm.legalName, firmId: firm.id })),
    );
  }, [franchisee]);

  const handleVerify = async (section: SectionName) => {
    if (!franchisee) return;
    setBusy(true);
    try {
      await apiVerifySection(franchisee.id, section);
      setVerifyModal(null);
      showToast('success', `${sectionLabels[section]} section verified successfully.`);
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to verify section.');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal || !rejectReason.trim() || !franchisee) return;
    setBusy(true);
    try {
      await apiRejectSection(franchisee.id, rejectModal.section, rejectReason);
      showToast('info', `${sectionLabels[rejectModal.section]} section rejected. The franchisee will be notified.`);
      setRejectModal(null);
      setRejectReason('');
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reject section.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="flex gap-2 mb-6">
            {tabs.map((t) => (
              <Skeleton key={t.key} className="h-10 w-28 rounded-full" />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (loadError || !franchisee) {
    return (
      <EmptyState
        title="Franchisee not found"
        message={loadError ?? 'This franchisee record may have been removed.'}
        action={<Button onClick={() => navigate('/review')}>Back to Directory</Button>}
      />
    );
  }


  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate('/review')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Review Queue
      </button>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar initials={getInitials(franchisee.pan || franchisee.id)} size="lg" />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-ink">Franchisee #{franchisee.id}</h1>
                <Badge kind={franchisee.overallStatus === 'ONBOARDED' ? 'ONBOARDED' : 'INCOMPLETE'} size="md" />
              </div>
              <p className="text-sm text-ink-secondary mt-1">
                {franchisee.franchiseeType === 'INDIVIDUAL' ? 'Individual Franchisee' : 'Company Franchisee'} ·
                Created {formatDate(franchisee.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Section status summary */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {franchisee.sections.map((sec) => (
            <div
              key={sec.section}
              className="rounded-xl bg-surface-subtle px-4 py-3 flex items-center justify-between"
            >
              <span className="text-xs font-medium text-ink-secondary">{sectionLabels[sec.section]}</span>
              <Badge kind={sec.status} />
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-brand-600 to-brand-400 text-white shadow-card'
                : 'bg-white text-ink-secondary border border-brand-100 hover:border-brand-300 hover:text-brand-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content + actions */}
      <Card className="p-6">
        {/* Section status + actions bar */}
        {currentSection && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-brand-50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink-secondary">Section status:</span>
              <Badge kind={currentSection.status} size="md" />
              {currentSection.verifiedBy && (
                <span className="inline-flex items-center gap-1 text-xs text-ink-secondary">
                  <BadgeCheck className="h-3.5 w-3.5 text-status-verified" />
                  Verified by {currentSection.verifiedBy} on {formatDate(currentSection.verifiedAt)}
                </span>
              )}
              {currentSection.rejectionReason && (
                <span className="text-xs text-status-rejected">
                  Reason: {currentSection.rejectionReason}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => setVerifyModal({ section: activeTab })}
                disabled={currentSection.status === 'VERIFIED'}
              >
                <CheckCircle2 className="h-4 w-4" />
                {currentSection.status === 'VERIFIED' ? 'Re-verify' : 'Verify'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  setRejectModal({
                    section: activeTab,
                    isReReject: currentSection.status === 'VERIFIED',
                  })
                }
              >
                <XCircle className="h-4 w-4" />
                {currentSection.status === 'VERIFIED' ? 'Re-reject' : 'Reject'}
              </Button>
            </div>
          </div>
        )}

        {/* FRANCHISEE_INFO */}
        {activeTab === 'FRANCHISEE_INFO' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoRow icon={UserIcon} label="Franchisee ID" value={`#${franchisee.id}`} />
            <InfoRow label="Franchisee Type" value={franchisee.franchiseeType === 'INDIVIDUAL' ? 'Individual' : 'Company'} />
            <InfoRow label="PAN" value={franchisee.pan || '—'} />
            <InfoRow label="Date of Birth" value={formatDate(franchisee.dateOfBirth)} />
            <InfoRow label="Company Registration No." value={franchisee.companyRegistrationNumber || '—'} />
            <InfoRow
              label="Address"
              value={
                [franchisee.addressLine1, franchisee.addressLine2, franchisee.city, franchisee.state, franchisee.pincode]
                  .filter(Boolean)
                  .join(', ') || '—'
              }
            />
            <InfoRow icon={Calendar} label="Created At" value={formatDate(franchisee.createdAt)} />
          </div>
        )}

        {/* RELATIONS */}
        {activeTab === 'RELATIONS' && (
          <div>
            {franchisee.relations.length === 0 ? (
              <EmptyState
                title="No relations added"
                message="This franchisee hasn't added any relations yet."
              />
            ) : (
              <div className="space-y-3">
                {franchisee.relations.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center gap-4 rounded-xl border border-brand-50 bg-surface-subtle px-5 py-4"
                  >
                    <Avatar initials={getInitials(rel.name)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink">{rel.name}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        {relationTypeLabels[rel.relationType]}
                        {rel.dateOfBirth && ` · DOB: ${formatDate(rel.dateOfBirth)}`}
                        {rel.anniversaryDate && ` · Anniversary: ${formatDate(rel.anniversaryDate)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FIRMS */}
        {activeTab === 'FIRMS' && (
          <div>
            {franchisee.firms.length === 0 ? (
              <EmptyState title="No firms added" message="This franchisee hasn't added any firms yet." />
            ) : (
              <div className="space-y-3">
                {franchisee.firms.map((firm) => (
                  <div
                    key={firm.id}
                    onClick={() => navigate(`/firm/${firm.id}`)}
                    className="flex items-center gap-4 rounded-xl border border-brand-50 bg-surface-subtle px-5 py-4 cursor-pointer hover:border-brand-200 hover:bg-brand-50/50 transition-all group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                        {firm.legalName}
                      </p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        {firmTypeLabels[firm.companyType]} · GST: {firm.gstNumber} · {firm.salons.length} salon(s)
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-secondary/30 group-hover:text-brand-600 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SALONS */}
        {activeTab === 'SALONS' && (
          <div>
            {allSalons.length === 0 ? (
              <EmptyState title="No salons added" message="This franchisee has no salons across their firms yet." />
            ) : (
              <div className="space-y-3">
                {allSalons.map((sal) => (
                  <div
                    key={sal.id}
                    onClick={() => navigate(`/salon/${sal.id}`)}
                    className="flex items-center gap-4 rounded-xl border border-brand-50 bg-surface-subtle px-5 py-4 cursor-pointer hover:border-brand-200 hover:bg-brand-50/50 transition-all group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                        {sal.salonName}
                      </p>
                      <p className="text-xs text-ink-secondary mt-0.5 truncate">
                        {sal.address || '—'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-secondary/30 group-hover:text-brand-600 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Verify confirmation modal */}
      <Modal
        open={!!verifyModal}
        onClose={() => setVerifyModal(null)}
        title={`Verify ${verifyModal ? sectionLabels[verifyModal.section] : ''} section?`}
        description="Confirm that you've reviewed all information in this section and it meets the requirements."
        primaryLabel="Confirm Verification"
        onPrimary={() => verifyModal && handleVerify(verifyModal.section)}
      >
        <div className="flex items-start gap-3 rounded-xl bg-brand-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
          <p className="text-sm text-ink">
            Once verified, the section will be marked as approved. You can still re-reject it later if needed.
          </p>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => {
          setRejectModal(null);
          setRejectReason('');
        }}
        title={`Reject ${rejectModal ? sectionLabels[rejectModal.section] : ''} section`}
        description={
          rejectModal?.isReReject
            ? 'This section was already verified. Rejecting it will require the franchisee to resubmit.'
            : 'The franchisee will be notified and asked to correct and resubmit this section.'
        }
        primaryLabel="Confirm Rejection"
        primaryVariant="danger"
        primaryDisabled={!rejectReason.trim()}
        onPrimary={handleRejectConfirm}
      >
        <Textarea
          label="Rejection reason"
          placeholder="Explain what needs to be corrected..."
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          error={!rejectReason.trim() && rejectModal ? 'A reason is required to reject a section.' : undefined}
        />
      </Modal>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof UserIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface-subtle px-4 py-3.5">
      {Icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-ink-secondary font-medium">{label}</p>
        <p className="text-sm text-ink mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
