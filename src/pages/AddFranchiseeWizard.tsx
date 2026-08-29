import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Building2,
  Scissors,
  Plus,
  PartyPopper,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { FileUpload } from '@/components/ui/FileUpload';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import * as wizardApi from '@/lib/wizardApi';
import { ApiError } from '@/lib/api';
import type {
  FirmType,
  FranchiseeType,
  WizardAgreementInput,
  WizardFirm,
  WizardOwner,
  WizardSalon,
} from '@/types/wizard';

type Step = 1 | 2 | 3;

const firmTypeOptions: { value: FirmType; label: string }[] = [
  { value: 'PROPRIETORSHIP', label: 'Proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'PRIVATE_LIMITED', label: 'Private Limited' },
  { value: 'LLP', label: 'LLP' },
];

const emptyOwnerForm = {
  prefix: '',
  fullName: '',
  contact: '',
  dateOfBirth: '',
  email: '',
  pan: '',
  aadhaar: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  franchiseeType: 'INDIVIDUAL' as FranchiseeType,
};

const emptyFirmForm = {
  legalName: '',
  firmType: '' as FirmType | '',
  gstNumber: '',
  fpCode: '',
};

const emptySalonForm = {
  salonCode: '',
  legacyCode: '',
  salonName: '',
  format: '',
  sqft: '',
  launchDate: '',
  district: '',
  state: '',
  pincode: '',
  addressLine1: '',
  contact1: '',
  contact2: '',
  email: '',
  ratecard: '',
  latitude: '',
  longitude: '',
  status: '',
  clusterHead: '',
  regionalHead: '',
  stateHead: '',
  region: '',
};

const emptyAgreementForm = {
  validFrom: '',
  validTill: '',
  year: '',
  renewalYear: '',
  royaltyTerms: '',
  status: '',
};

export function AddFranchiseeWizard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshFranchisees } = useApp();

  const [step, setStep] = useState<Step>(1);
  const [finished, setFinished] = useState(false);

  const [owners, setOwners] = useState<WizardOwner[]>([]);
  const [firms, setFirms] = useState<WizardFirm[]>([]);
  const [salons, setSalons] = useState<WizardSalon[]>([]);

  const [completion, setCompletion] = useState<number | null>(null);

  // Step 1 — owner form
  const [ownerForm, setOwnerForm] = useState(emptyOwnerForm);
  const [ownerErrors, setOwnerErrors] = useState<Record<string, string>>({});
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerDoc, setOwnerDoc] = useState<File | null>(null);
  const [ownerDocUploading, setOwnerDocUploading] = useState(false);

  // Step 2 — firm form
  const [firmForm, setFirmForm] = useState(emptyFirmForm);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [primaryOwnerId, setPrimaryOwnerId] = useState<string>('');
  const [firmErrors, setFirmErrors] = useState<Record<string, string>>({});
  const [firmSaving, setFirmSaving] = useState(false);
  const [firmDoc, setFirmDoc] = useState<File | null>(null);
  const [firmDocUploading, setFirmDocUploading] = useState(false);

  // Step 3 — salon form
  const [selectedFirmId, setSelectedFirmId] = useState<string>('');
  const [salonForm, setSalonForm] = useState(emptySalonForm);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementForm, setAgreementForm] = useState(emptyAgreementForm);
  const [salonErrors, setSalonErrors] = useState<Record<string, string>>({});
  const [salonSaving, setSalonSaving] = useState(false);
  const [salonDoc, setSalonDoc] = useState<File | null>(null);
  const [salonDocUploading, setSalonDocUploading] = useState(false);

  useEffect(() => {
    if (firms.length > 0 && !selectedFirmId) setSelectedFirmId(firms[firms.length - 1].id);
  }, [firms, selectedFirmId]);

  const refreshCompletion = async (franchiseeId: string) => {
    try {
      const data = await wizardApi.getWizardCompletion(franchiseeId);
      setCompletion(data.completionPercentage);
    } catch {
      // Completion is a nice-to-have progress indicator — a failure here shouldn't
      // block the rest of the wizard.
    }
  };

  const errorMessage = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

  // ---------------------------------------------------------------------
  // Step 1 — owners
  // ---------------------------------------------------------------------

  const validateOwner = () => {
    const e: Record<string, string> = {};
    if (!ownerForm.fullName.trim()) e.fullName = 'Full name is required';
    if (!ownerForm.contact.trim()) e.contact = 'Contact number is required';
    if (!ownerForm.pan.trim()) e.pan = 'PAN is required';
    setOwnerErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveOwner = async () => {
    if (!validateOwner()) return;
    setOwnerSaving(true);
    try {
      const created = await wizardApi.createWizardOwner({
        prefix: ownerForm.prefix.trim() || undefined,
        fullName: ownerForm.fullName.trim(),
        contact: ownerForm.contact.trim(),
        dateOfBirth: ownerForm.dateOfBirth || undefined,
        email: ownerForm.email.trim() || undefined,
        pan: ownerForm.pan.trim(),
        aadhaar: ownerForm.aadhaar.trim() || undefined,
        addressLine1: ownerForm.addressLine1.trim() || undefined,
        addressLine2: ownerForm.addressLine2.trim() || undefined,
        city: ownerForm.city.trim() || undefined,
        state: ownerForm.state.trim() || undefined,
        pincode: ownerForm.pincode.trim() || undefined,
        franchiseeType: ownerForm.franchiseeType,
      });
      setOwners((prev) => [...prev, created]);
      showToast('success', `${created.fullName} added as an owner.`);

      if (ownerDoc) {
        setOwnerDocUploading(true);
        try {
          await wizardApi.uploadWizardDocument('FRANCHISEE', created.id, 'OWNER_ID_PROOF', ownerDoc);
        } catch (err) {
          showToast('error', errorMessage(err, 'Owner saved, but the ID proof document failed to upload.'));
        } finally {
          setOwnerDocUploading(false);
        }
      }

      setOwnerForm(emptyOwnerForm);
      setOwnerErrors({});
      setOwnerDoc(null);
      void refreshCompletion(created.id);
    } catch (err) {
      showToast('error', errorMessage(err, 'Failed to save owner.'));
    } finally {
      setOwnerSaving(false);
    }
  };

  // ---------------------------------------------------------------------
  // Step 2 — firms
  // ---------------------------------------------------------------------

  const toggleOwnerSelected = (ownerId: string) => {
    setSelectedOwnerIds((prev) => {
      const next = prev.includes(ownerId) ? prev.filter((id) => id !== ownerId) : [...prev, ownerId];
      if (!next.includes(primaryOwnerId)) setPrimaryOwnerId(next[0] ?? '');
      return next;
    });
  };

  const validateFirm = () => {
    const e: Record<string, string> = {};
    if (!firmForm.legalName.trim()) e.legalName = 'Legal name is required';
    if (!firmForm.firmType) e.firmType = 'Firm type is required';
    if (selectedOwnerIds.length === 0) e.owners = 'Select at least one owner';
    else if (!primaryOwnerId) e.owners = 'Mark exactly one selected owner as Primary';
    setFirmErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveFirm = async () => {
    if (!validateFirm() || !firmForm.firmType) return;
    setFirmSaving(true);
    try {
      const created = await wizardApi.createWizardFirm({
        legalName: firmForm.legalName.trim(),
        firmType: firmForm.firmType,
        gstNumber: firmForm.gstNumber.trim() || undefined,
        fpCode: firmForm.fpCode.trim() || undefined,
        owners: selectedOwnerIds.map((id) => ({
          franchiseeId: Number(id),
          isPrimary: id === primaryOwnerId,
        })),
      });
      setFirms((prev) => [...prev, created]);
      showToast('success', `${created.legalName} added.`);

      if (firmDoc) {
        setFirmDocUploading(true);
        try {
          await wizardApi.uploadWizardDocument('FIRM', created.id, 'FIRM_GST_CERTIFICATE', firmDoc);
        } catch (err) {
          showToast('error', errorMessage(err, 'Business saved, but the GST certificate failed to upload.'));
        } finally {
          setFirmDocUploading(false);
        }
      }

      setFirmForm(emptyFirmForm);
      setSelectedOwnerIds([]);
      setPrimaryOwnerId('');
      setFirmErrors({});
      setFirmDoc(null);
      if (owners[0]) void refreshCompletion(owners[0].id);
    } catch (err) {
      showToast('error', errorMessage(err, 'Failed to save business.'));
    } finally {
      setFirmSaving(false);
    }
  };

  // ---------------------------------------------------------------------
  // Step 3 — salons
  // ---------------------------------------------------------------------

  const validateSalon = () => {
    const e: Record<string, string> = {};
    if (!selectedFirmId) e.firm = 'Select which business this salon belongs to';
    if (!salonForm.salonName.trim()) e.salonName = 'Salon name is required';
    setSalonErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildAgreement = (): WizardAgreementInput | undefined => {
    if (!agreementOpen) return undefined;
    const hasAny = Object.values(agreementForm).some((v) => v.trim().length > 0);
    if (!hasAny) return undefined;
    return {
      validFrom: agreementForm.validFrom || undefined,
      validTill: agreementForm.validTill || undefined,
      year: agreementForm.year.trim() || undefined,
      renewalYear: agreementForm.renewalYear.trim() || undefined,
      royaltyTerms: agreementForm.royaltyTerms.trim() || undefined,
      status: agreementForm.status.trim() || undefined,
    };
  };

  const handleSaveSalon = async () => {
    if (!validateSalon()) return;
    setSalonSaving(true);
    try {
      const created = await wizardApi.createWizardSalon({
        firmId: selectedFirmId,
        salonCode: salonForm.salonCode.trim() || undefined,
        legacyCode: salonForm.legacyCode.trim() || undefined,
        salonName: salonForm.salonName.trim(),
        format: salonForm.format.trim() || undefined,
        sqft: salonForm.sqft.trim() || undefined,
        launchDate: salonForm.launchDate || undefined,
        district: salonForm.district.trim() || undefined,
        state: salonForm.state.trim() || undefined,
        pincode: salonForm.pincode.trim() || undefined,
        addressLine1: salonForm.addressLine1.trim() || undefined,
        contact1: salonForm.contact1.trim() || undefined,
        contact2: salonForm.contact2.trim() || undefined,
        email: salonForm.email.trim() || undefined,
        ratecard: salonForm.ratecard.trim() || undefined,
        latitude: salonForm.latitude.trim() || undefined,
        longitude: salonForm.longitude.trim() || undefined,
        status: salonForm.status.trim() || undefined,
        clusterHead: salonForm.clusterHead.trim() || undefined,
        regionalHead: salonForm.regionalHead.trim() || undefined,
        stateHead: salonForm.stateHead.trim() || undefined,
        region: salonForm.region.trim() || undefined,
        agreement: buildAgreement(),
      });
      setSalons((prev) => [...prev, created]);
      showToast('success', `${created.salonName} added.`);

      if (salonDoc) {
        setSalonDocUploading(true);
        try {
          await wizardApi.uploadWizardDocument('SALON', created.id, 'SALON_AGREEMENT', salonDoc);
        } catch (err) {
          showToast('error', errorMessage(err, 'Salon saved, but the agreement document failed to upload.'));
        } finally {
          setSalonDocUploading(false);
        }
      }

      setSalonForm(emptySalonForm);
      setAgreementForm(emptyAgreementForm);
      setAgreementOpen(false);
      setSalonErrors({});
      setSalonDoc(null);
      if (owners[0]) void refreshCompletion(owners[0].id);
    } catch (err) {
      showToast('error', errorMessage(err, 'Failed to save salon.'));
    } finally {
      setSalonSaving(false);
    }
  };

  // ---------------------------------------------------------------------
  // Finish
  // ---------------------------------------------------------------------

  const handleFinish = async () => {
    await refreshFranchisees();
    setFinished(true);
  };

  const primaryFranchiseeId = owners[0]?.id;

  const steps: { key: Step; label: string; icon: typeof UserPlus; done: boolean }[] = [
    { key: 1, label: 'Franchisee', icon: UserPlus, done: owners.length > 0 },
    { key: 2, label: 'Business', icon: Building2, done: firms.length > 0 },
    { key: 3, label: 'Salon', icon: Scissors, done: salons.length > 0 },
  ];

  const canGoToStep = (target: Step) => {
    if (target === 2) return owners.length > 0;
    if (target === 3) return firms.length > 0;
    return true;
  };

  if (finished) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-card">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-ink">Franchisee record created</h1>
          <p className="text-sm text-ink-secondary mt-1.5">
            The following was entered and landed straight at Onboarded status.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface-subtle px-4 py-4">
              <p className="text-2xl font-bold text-ink">{owners.length}</p>
              <p className="text-xs text-ink-secondary mt-1">Owner(s)</p>
            </div>
            <div className="rounded-xl bg-surface-subtle px-4 py-4">
              <p className="text-2xl font-bold text-ink">{firms.length}</p>
              <p className="text-xs text-ink-secondary mt-1">Business(es)</p>
            </div>
            <div className="rounded-xl bg-surface-subtle px-4 py-4">
              <p className="text-2xl font-bold text-ink">{salons.length}</p>
              <p className="text-xs text-ink-secondary mt-1">Salon(s)</p>
            </div>
          </div>

          {completion != null && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <ProgressRing percentage={completion} size={56} />
              <span className="text-sm text-ink-secondary">Profile completion</span>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={() => {
                setStep(1);
                setFinished(false);
                setOwners([]);
                setFirms([]);
                setSalons([]);
                setCompletion(null);
              }}
            >
              Add Another Franchisee
            </Button>
            <Button
              onClick={() => primaryFranchiseeId && navigate(`/franchisee/${primaryFranchiseeId}`)}
              disabled={!primaryFranchiseeId}
            >
              View Franchisee Record
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {!primaryFranchiseeId && (
            <p className="mt-3 text-xs text-ink-secondary">
              No franchisee ID was captured, so the detail view link isn't available for this record.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </button>

      <div>
        <h1 className="text-2xl font-bold text-ink">Add Franchisee</h1>
        <p className="text-sm text-ink-secondary mt-1">
          Enter a real, already-operating franchise directly — owners, business(es), and salon(s). This lands the
          record at Onboarded status immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Summary panel */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">Progress</h2>
              {completion != null && <ProgressRing percentage={completion} size={48} />}
            </div>
            <div className="space-y-2">
              {steps.map((s) => (
                <button
                  key={s.key}
                  onClick={() => canGoToStep(s.key) && setStep(s.key)}
                  disabled={!canGoToStep(s.key)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    step === s.key
                      ? 'bg-gradient-to-r from-brand-600 to-brand-400 text-white shadow-card'
                      : 'bg-surface-subtle text-ink-secondary hover:bg-brand-50'
                  }`}
                >
                  {s.done ? (
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${step === s.key ? 'text-white' : 'text-status-verified'}`} />
                  ) : (
                    <s.icon className="h-4 w-4 shrink-0" />
                  )}
                  {s.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink mb-3">What I've added so far</h2>
            <SummaryGroup icon={UserPlus} label="Owners" items={owners.map((o) => o.fullName)} />
            <SummaryGroup icon={Building2} label="Businesses" items={firms.map((f) => f.legalName)} />
            <SummaryGroup icon={Scissors} label="Salons" items={salons.map((s) => s.salonName)} />
          </Card>
        </div>

        {/* Step forms */}
        <Card className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-ink">Franchisee Details</h2>
                <p className="text-sm text-ink-secondary mt-0.5">
                  Add one owner at a time. Add multiple owners for a co-owned franchisee.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prefix"
                  placeholder="e.g. Mr., Mrs."
                  value={ownerForm.prefix}
                  onChange={(e) => setOwnerForm({ ...ownerForm, prefix: e.target.value })}
                />
                <Input
                  label="Full Name"
                  value={ownerForm.fullName}
                  onChange={(e) => setOwnerForm({ ...ownerForm, fullName: e.target.value })}
                  error={ownerErrors.fullName}
                />
                <Input
                  label="Contact"
                  value={ownerForm.contact}
                  onChange={(e) => setOwnerForm({ ...ownerForm, contact: e.target.value })}
                  error={ownerErrors.contact}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={ownerForm.dateOfBirth}
                  onChange={(e) => setOwnerForm({ ...ownerForm, dateOfBirth: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={ownerForm.email}
                  onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                />
                <Input
                  label="PAN"
                  value={ownerForm.pan}
                  onChange={(e) => setOwnerForm({ ...ownerForm, pan: e.target.value.toUpperCase() })}
                  error={ownerErrors.pan}
                />
                <Input
                  label="Aadhaar"
                  value={ownerForm.aadhaar}
                  onChange={(e) => setOwnerForm({ ...ownerForm, aadhaar: e.target.value })}
                />
                <Select
                  label="Franchisee Type"
                  value={ownerForm.franchiseeType}
                  onChange={(e) => setOwnerForm({ ...ownerForm, franchiseeType: e.target.value as FranchiseeType })}
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="COMPANY">Company</option>
                </Select>
                <Input
                  label="Address Line 1"
                  value={ownerForm.addressLine1}
                  onChange={(e) => setOwnerForm({ ...ownerForm, addressLine1: e.target.value })}
                  className="sm:col-span-2"
                />
                <Input
                  label="Address Line 2"
                  value={ownerForm.addressLine2}
                  onChange={(e) => setOwnerForm({ ...ownerForm, addressLine2: e.target.value })}
                  className="sm:col-span-2"
                />
                <Input
                  label="City"
                  value={ownerForm.city}
                  onChange={(e) => setOwnerForm({ ...ownerForm, city: e.target.value })}
                />
                <Input
                  label="State"
                  value={ownerForm.state}
                  onChange={(e) => setOwnerForm({ ...ownerForm, state: e.target.value })}
                />
                <Input
                  label="Pincode"
                  value={ownerForm.pincode}
                  onChange={(e) => setOwnerForm({ ...ownerForm, pincode: e.target.value })}
                />
              </div>

              <FileUpload
                label="PAN / Aadhaar proof"
                optional
                onFileSelected={setOwnerDoc}
                uploading={ownerDocUploading}
              />

              <div className="flex flex-wrap gap-3 pt-2 border-t border-brand-50">
                <Button onClick={handleSaveOwner} disabled={ownerSaving}>
                  <Plus className="h-4 w-4" />
                  {ownerSaving ? 'Saving...' : owners.length > 0 ? 'Add Another Owner' : 'Save Owner'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setStep(2)}
                  disabled={owners.length === 0}
                >
                  Continue to Business
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-ink">Business Details</h2>
                <p className="text-sm text-ink-secondary mt-0.5">
                  Select which owner(s) hold this business, and mark exactly one as Primary.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Legal Name"
                  value={firmForm.legalName}
                  onChange={(e) => setFirmForm({ ...firmForm, legalName: e.target.value })}
                  error={firmErrors.legalName}
                />
                <div>
                  <Select
                    label="Firm Type"
                    value={firmForm.firmType}
                    onChange={(e) => setFirmForm({ ...firmForm, firmType: e.target.value as FirmType })}
                  >
                    <option value="">Select a firm type...</option>
                    {firmTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                  {firmErrors.firmType && <p className="text-xs text-status-rejected mt-1.5">{firmErrors.firmType}</p>}
                </div>
                <Input
                  label="GST Number"
                  value={firmForm.gstNumber}
                  onChange={(e) => setFirmForm({ ...firmForm, gstNumber: e.target.value })}
                />
                <Input
                  label="FPCode"
                  value={firmForm.fpCode}
                  onChange={(e) => setFirmForm({ ...firmForm, fpCode: e.target.value })}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-ink mb-2">Owners</p>
                {owners.length === 0 ? (
                  <p className="text-sm text-ink-secondary">Add at least one owner in Step 1 first.</p>
                ) : (
                  <div className="space-y-2">
                    {owners.map((owner) => {
                      const checked = selectedOwnerIds.includes(owner.id);
                      return (
                        <div
                          key={owner.id}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                            checked ? 'border-brand-300 bg-brand-50/50' : 'border-brand-50 bg-surface-subtle'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOwnerSelected(owner.id)}
                            className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
                          />
                          <Avatar initials={getInitials(owner.fullName)} size="sm" />
                          <span className="flex-1 text-sm text-ink">{owner.fullName}</span>
                          {checked && (
                            <label className="flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer">
                              <input
                                type="radio"
                                name="primaryOwner"
                                checked={primaryOwnerId === owner.id}
                                onChange={() => setPrimaryOwnerId(owner.id)}
                                className="h-3.5 w-3.5 text-brand-600 focus:ring-brand-400"
                              />
                              Primary
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {firmErrors.owners && <p className="text-xs text-status-rejected mt-2">{firmErrors.owners}</p>}
              </div>

              <FileUpload
                label="GST certificate"
                optional
                onFileSelected={setFirmDoc}
                uploading={firmDocUploading}
              />

              <div className="flex flex-wrap gap-3 pt-2 border-t border-brand-50">
                <Button onClick={handleSaveFirm} disabled={firmSaving}>
                  <Plus className="h-4 w-4" />
                  {firmSaving ? 'Saving...' : firms.length > 0 ? 'Add Another Business' : 'Save Business'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setStep(3)}
                  disabled={firms.length === 0}
                >
                  Continue to Salons
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-ink">Salon Details</h2>
                <p className="text-sm text-ink-secondary mt-0.5">
                  Add one or more salons under a business.
                </p>
              </div>

              {firms.length > 1 && (
                <Select
                  label="Business"
                  value={selectedFirmId}
                  onChange={(e) => setSelectedFirmId(e.target.value)}
                >
                  {firms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.legalName}
                    </option>
                  ))}
                </Select>
              )}
              {salonErrors.firm && <p className="text-xs text-status-rejected">{salonErrors.firm}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Salon Code"
                  value={salonForm.salonCode}
                  onChange={(e) => setSalonForm({ ...salonForm, salonCode: e.target.value })}
                />
                <Input
                  label="Legacy Code"
                  value={salonForm.legacyCode}
                  onChange={(e) => setSalonForm({ ...salonForm, legacyCode: e.target.value })}
                />
                <Input
                  label="Salon Name"
                  value={salonForm.salonName}
                  onChange={(e) => setSalonForm({ ...salonForm, salonName: e.target.value })}
                  error={salonErrors.salonName}
                  className="sm:col-span-2"
                />
                <Input
                  label="Format"
                  value={salonForm.format}
                  onChange={(e) => setSalonForm({ ...salonForm, format: e.target.value })}
                />
                <Input
                  label="Sq.ft"
                  value={salonForm.sqft}
                  onChange={(e) => setSalonForm({ ...salonForm, sqft: e.target.value })}
                />
                <Input
                  label="Launch Date"
                  type="date"
                  value={salonForm.launchDate}
                  onChange={(e) => setSalonForm({ ...salonForm, launchDate: e.target.value })}
                />
                <Input
                  label="Status"
                  value={salonForm.status}
                  onChange={(e) => setSalonForm({ ...salonForm, status: e.target.value })}
                />
                <Input
                  label="Address"
                  value={salonForm.addressLine1}
                  onChange={(e) => setSalonForm({ ...salonForm, addressLine1: e.target.value })}
                  className="sm:col-span-2"
                />
                <Input
                  label="District"
                  value={salonForm.district}
                  onChange={(e) => setSalonForm({ ...salonForm, district: e.target.value })}
                />
                <Input
                  label="State"
                  value={salonForm.state}
                  onChange={(e) => setSalonForm({ ...salonForm, state: e.target.value })}
                />
                <Input
                  label="Pincode"
                  value={salonForm.pincode}
                  onChange={(e) => setSalonForm({ ...salonForm, pincode: e.target.value })}
                />
                <Input
                  label="Contact Number 1"
                  value={salonForm.contact1}
                  onChange={(e) => setSalonForm({ ...salonForm, contact1: e.target.value })}
                />
                <Input
                  label="Contact Number 2"
                  value={salonForm.contact2}
                  onChange={(e) => setSalonForm({ ...salonForm, contact2: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={salonForm.email}
                  onChange={(e) => setSalonForm({ ...salonForm, email: e.target.value })}
                />
                <Input
                  label="Ratecard"
                  value={salonForm.ratecard}
                  onChange={(e) => setSalonForm({ ...salonForm, ratecard: e.target.value })}
                />
                <Input
                  label="Latitude"
                  value={salonForm.latitude}
                  onChange={(e) => setSalonForm({ ...salonForm, latitude: e.target.value })}
                />
                <Input
                  label="Longitude"
                  value={salonForm.longitude}
                  onChange={(e) => setSalonForm({ ...salonForm, longitude: e.target.value })}
                />
                <Input
                  label="Cluster Head"
                  value={salonForm.clusterHead}
                  onChange={(e) => setSalonForm({ ...salonForm, clusterHead: e.target.value })}
                />
                <Input
                  label="Regional Head"
                  value={salonForm.regionalHead}
                  onChange={(e) => setSalonForm({ ...salonForm, regionalHead: e.target.value })}
                />
                <Input
                  label="State Head"
                  value={salonForm.stateHead}
                  onChange={(e) => setSalonForm({ ...salonForm, stateHead: e.target.value })}
                />
                <Input
                  label="Region"
                  value={salonForm.region}
                  onChange={(e) => setSalonForm({ ...salonForm, region: e.target.value })}
                />
              </div>

              {/* Collapsible agreement section */}
              <div className="rounded-xl border border-brand-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAgreementOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface-subtle text-sm font-medium text-ink"
                >
                  <span>{agreementOpen ? 'Agreement details (optional)' : '+ Add agreement details (optional)'}</span>
                  {agreementOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {agreementOpen && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Valid From"
                      type="date"
                      value={agreementForm.validFrom}
                      onChange={(e) => setAgreementForm({ ...agreementForm, validFrom: e.target.value })}
                    />
                    <Input
                      label="Valid Till"
                      type="date"
                      value={agreementForm.validTill}
                      onChange={(e) => setAgreementForm({ ...agreementForm, validTill: e.target.value })}
                    />
                    <Input
                      label="Year"
                      value={agreementForm.year}
                      onChange={(e) => setAgreementForm({ ...agreementForm, year: e.target.value })}
                    />
                    <Input
                      label="Renewal Year"
                      value={agreementForm.renewalYear}
                      onChange={(e) => setAgreementForm({ ...agreementForm, renewalYear: e.target.value })}
                    />
                    <Input
                      label="Royalty Terms"
                      value={agreementForm.royaltyTerms}
                      onChange={(e) => setAgreementForm({ ...agreementForm, royaltyTerms: e.target.value })}
                      className="sm:col-span-2"
                    />
                    <Input
                      label="Agreement Status"
                      value={agreementForm.status}
                      onChange={(e) => setAgreementForm({ ...agreementForm, status: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <FileUpload
                label="Agreement PDF"
                optional
                accept=".pdf"
                onFileSelected={setSalonDoc}
                uploading={salonDocUploading}
              />

              <div className="flex flex-wrap gap-3 pt-2 border-t border-brand-50">
                <Button onClick={handleSaveSalon} disabled={salonSaving}>
                  <Plus className="h-4 w-4" />
                  {salonSaving ? 'Saving...' : salons.length > 0 ? 'Add Another Salon' : 'Save Salon'}
                </Button>
                <Button onClick={handleFinish} variant="secondary" disabled={salons.length === 0}>
                  Finish
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SummaryGroup({
  icon: Icon,
  label,
  items,
}: {
  icon: typeof UserPlus;
  label: string;
  items: string[];
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-brand-500" />
        <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
          {label} ({items.length})
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-ink-secondary/70 pl-5.5">None added yet</p>
      ) : (
        <ul className="space-y-1 pl-5.5">
          {items.map((name, i) => (
            <li key={i} className="text-xs text-ink truncate">
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
