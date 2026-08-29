import { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Search, Link2, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  listOfficials,
  createOfficial,
  updateOfficial,
  linkUserToOfficial,
  deleteOfficial,
  OfficialInUseError,
} from '@/lib/officialsApi';
import { ApiError } from '@/lib/api';
import type { Official } from '@/types';

const officialTypeLabels: Record<string, string> = {
  CLUSTER_MANAGER: 'Cluster Manager',
  REGIONAL_MANAGER: 'Regional Manager',
  STATE_HEAD: 'State Head',
};

const officialTypeOptions = Object.keys(officialTypeLabels);

const emptyForm = { officialType: '', name: '', contact: '', email: '', region: '' };

export function OfficialsManagement() {
  const { showToast } = useToast();
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [editModal, setEditModal] = useState<Official | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [linkModal, setLinkModal] = useState<Official | null>(null);
  const [linkUserId, setLinkUserId] = useState('');

  const [deleteModal, setDeleteModal] = useState<Official | null>(null);
  const [deleteBlockedCount, setDeleteBlockedCount] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listOfficials({ officialType: typeFilter || undefined, region: regionFilter || undefined })
      .then((page) => setOfficials(page.content))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load officials.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [typeFilter, regionFilter]);

  const filtered = officials.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return o.name.toLowerCase().includes(q) || o.contact.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    const errs: Record<string, string> = {};
    if (!createForm.officialType) errs.officialType = 'Type is required';
    if (!createForm.name.trim()) errs.name = 'Name is required';
    if (!createForm.contact.trim()) errs.contact = 'Contact is required';
    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await createOfficial({
        officialType: createForm.officialType,
        name: createForm.name.trim(),
        contact: createForm.contact.trim(),
        email: createForm.email.trim() || undefined,
        region: createForm.region.trim() || undefined,
        userId: null,
      });
      showToast('success', `${createForm.name} added as an official.`);
      setCreateModal(false);
      setCreateForm(emptyForm);
      setCreateErrors({});
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to create official.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (o: Official) => {
    setEditModal(o);
    setEditForm({ officialType: o.officialType, name: o.name, contact: o.contact, email: o.email ?? '', region: o.region ?? '' });
  };

  const handleEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await updateOfficial(editModal.id, {
        officialType: editForm.officialType,
        name: editForm.name.trim(),
        contact: editForm.contact.trim(),
        email: editForm.email.trim() || undefined,
        region: editForm.region.trim() || undefined,
      });
      showToast('success', 'Official updated.');
      setEditModal(null);
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to update official.');
    } finally {
      setSaving(false);
    }
  };

  const handleLink = async () => {
    if (!linkModal || !linkUserId) return;
    setSaving(true);
    try {
      await linkUserToOfficial(linkModal.id, Number(linkUserId));
      showToast('success', `Login linked to ${linkModal.name}.`);
      setLinkModal(null);
      setLinkUserId('');
      load();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to link user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setSaving(true);
    try {
      await deleteOfficial(deleteModal.id);
      showToast('success', `${deleteModal.name} deleted.`);
      setDeleteModal(null);
      setDeleteBlockedCount(null);
      load();
    } catch (err) {
      if (err instanceof OfficialInUseError) {
        setDeleteBlockedCount(err.count ?? null);
      } else {
        showToast('error', err instanceof ApiError ? err.message : 'Failed to delete official.');
        setDeleteModal(null);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Officials</h1>
          <p className="text-sm text-ink-secondary mt-1">
            Cluster managers, regional managers, and state heads assignable to salons
          </p>
        </div>
        <Button onClick={() => setCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Add Official
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-secondary/50" />
          <Input placeholder="Search by name or contact..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-52">
          <option value="">All types</option>
          {officialTypeOptions.map((t) => (
            <option key={t} value={t}>
              {officialTypeLabels[t]}
            </option>
          ))}
        </Select>
        <Input placeholder="Region" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="w-full sm:w-40" />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : error ? (
          <EmptyState title="Couldn't load officials" message={error} icon={<ShieldCheck className="h-8 w-8" />} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No officials found" message="Add an official to get started." icon={<ShieldCheck className="h-8 w-8" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-100 bg-surface-subtle/50">
                  <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-6 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">Region</th>
                  <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">Contact</th>
                  <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">Linked User</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-ink">{o.name}</td>
                    <td className="px-3 py-4">
                      <Badge kind="DRAFT" label={officialTypeLabels[o.officialType] ?? o.officialType} />
                    </td>
                    <td className="px-3 py-4 text-sm text-ink-secondary">{o.region || '—'}</td>
                    <td className="px-3 py-4 text-sm text-ink-secondary">{o.contact}</td>
                    <td className="px-3 py-4">
                      {o.userId ? (
                        <span className="text-xs text-status-verified font-medium">Linked (User #{o.userId})</span>
                      ) : (
                        <span className="text-xs text-ink-secondary">Not linked</span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {!o.userId && (
                          <Button size="sm" variant="ghost" onClick={() => setLinkModal(o)}>
                            <Link2 className="h-3.5 w-3.5" />
                            Link User
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEdit(o)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => { setDeleteModal(o); setDeleteBlockedCount(null); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create modal */}
      <Modal
        open={createModal}
        onClose={() => {
          setCreateModal(false);
          setCreateForm(emptyForm);
          setCreateErrors({});
        }}
        title="Add Official"
        description="Add a cluster manager, regional manager, or state head."
        primaryLabel={saving ? 'Saving...' : 'Add Official'}
        primaryDisabled={saving}
        onPrimary={handleCreate}
      >
        <div className="space-y-4">
          <Select label="Type" value={createForm.officialType} onChange={(e) => setCreateForm({ ...createForm, officialType: e.target.value })}>
            <option value="">Select a type...</option>
            {officialTypeOptions.map((t) => (
              <option key={t} value={t}>
                {officialTypeLabels[t]}
              </option>
            ))}
          </Select>
          {createErrors.officialType && <p className="text-xs text-status-rejected -mt-2">{createErrors.officialType}</p>}
          <Input label="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} error={createErrors.name} />
          <Input label="Contact" value={createForm.contact} onChange={(e) => setCreateForm({ ...createForm, contact: e.target.value })} error={createErrors.contact} />
          <Input label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          <Input label="Region" value={createForm.region} onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })} />
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title="Edit Official"
        description={editModal ? `Update details for ${editModal.name}.` : ''}
        primaryLabel={saving ? 'Saving...' : 'Save Changes'}
        primaryDisabled={saving}
        onPrimary={handleEdit}
      >
        <div className="space-y-4">
          <Select label="Type" value={editForm.officialType} onChange={(e) => setEditForm({ ...editForm, officialType: e.target.value })}>
            {officialTypeOptions.map((t) => (
              <option key={t} value={t}>
                {officialTypeLabels[t]}
              </option>
            ))}
          </Select>
          <Input label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Contact" value={editForm.contact} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })} />
          <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <Input label="Region" value={editForm.region} onChange={(e) => setEditForm({ ...editForm, region: e.target.value })} />
        </div>
      </Modal>

      {/* Link user modal */}
      <Modal
        open={!!linkModal}
        onClose={() => {
          setLinkModal(null);
          setLinkUserId('');
        }}
        title="Link User"
        description={linkModal ? `Attach a login to ${linkModal.name}.` : ''}
        primaryLabel={saving ? 'Linking...' : 'Link User'}
        primaryDisabled={!linkUserId || saving}
        onPrimary={handleLink}
      >
        <Input
          label="User ID"
          type="number"
          placeholder="e.g. 5"
          value={linkUserId}
          onChange={(e) => setLinkUserId(e.target.value)}
        />
      </Modal>

      {/* Delete modal */}
      <Modal
        open={!!deleteModal}
        onClose={() => {
          setDeleteModal(null);
          setDeleteBlockedCount(null);
        }}
        title="Delete Official"
        description={deleteModal ? `Delete ${deleteModal.name}? This cannot be undone.` : ''}
        primaryLabel={saving ? 'Deleting...' : 'Delete'}
        primaryVariant="danger"
        primaryDisabled={saving || deleteBlockedCount != null}
        onPrimary={handleDelete}
      >
        {deleteBlockedCount != null ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-status-rejected">
            This official is currently assigned to {deleteBlockedCount} salon{deleteBlockedCount === 1 ? '' : 's'}.
            Reassign {deleteBlockedCount === 1 ? 'that salon' : 'those salons'} to a different official before deleting.
          </div>
        ) : (
          <p className="text-sm text-ink-secondary">This action cannot be undone.</p>
        )}
      </Modal>
    </div>
  );
}
