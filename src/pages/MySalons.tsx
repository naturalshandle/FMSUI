import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, MapPin, Percent, Scissors, Store, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getMySalon, getMySalons } from '@/lib/officialsApi';
import { ApiError } from '@/lib/api';
import type { SalonForOfficial } from '@/types';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function MySalons() {
  const { id } = useParams();
  return id ? <MySalonDetail salonId={id} /> : <MySalonsList />;
}

function MySalonsList() {
  const navigate = useNavigate();
  const [salons, setSalons] = useState<SalonForOfficial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    getMySalons()
      .then(setSalons)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load your assigned salons.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">My Salons</h1>
        <p className="text-sm text-ink-secondary mt-1">Salons assigned to you as the responsible official.</p>
      </div>

      <Card className="p-6">
        {loadError ? (
          <EmptyState title="Couldn't load your salons" message={loadError} action={<Button onClick={load}>Retry</Button>} />
        ) : salons.length === 0 ? (
          <EmptyState
            title="No assigned salons"
            message="You aren't currently linked to any salons as an official."
            icon={<Scissors className="h-8 w-8" />}
          />
        ) : (
          <div className="divide-y divide-brand-50">
            {salons.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/my-salons/${s.id}`)}
                className="w-full flex items-center justify-between gap-4 py-4 text-left hover:bg-brand-50/40 rounded-xl px-2 -mx-2 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{s.salonName}</p>
                  <p className="text-xs text-ink-secondary">
                    {s.firm?.legalName ?? 'No firm assigned'} · {s.district || s.state || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-ink font-medium">
                    {s.currentRoyaltyPercentage != null ? `${s.currentRoyaltyPercentage}%` : 'Royalty not set'}
                  </p>
                  <p className="text-xs text-ink-secondary">{s.operationalStatus}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MySalonDetail({ salonId }: { salonId: string }) {
  const navigate = useNavigate();
  const [salon, setSalon] = useState<SalonForOfficial | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setForbidden(false);
    setLoadError(null);
    getMySalon(salonId)
      .then(setSalon)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true);
        } else {
          setLoadError(err instanceof ApiError ? err.message : 'Failed to load this salon.');
        }
      })
      .finally(() => setLoading(false));
  }, [salonId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card className="p-6">
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  if (forbidden) {
    return (
      <EmptyState
        title="Not your assigned salon"
        message="You're a recognized official, but you aren't the one assigned to this specific salon."
        action={<Button onClick={() => navigate('/my-salons')}>Back to My Salons</Button>}
      />
    );
  }

  if (loadError || !salon) {
    return (
      <EmptyState
        title="Salon not found"
        message={loadError ?? 'This salon may have been removed or reassigned.'}
        action={<Button onClick={() => navigate('/my-salons')}>Back to My Salons</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/my-salons')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Salons
      </button>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
            <Scissors className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">{salon.salonName}</h1>
            <p className="text-sm text-ink-secondary mt-1">Salon #{salon.id} · {salon.operationalStatus}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Salon Details</h2>
          <div className="space-y-4">
            <DetailRow icon={Store} label="Salon Name" value={salon.salonName} />
            <DetailRow icon={MapPin} label="Address" value={salon.address || '—'} />
            <DetailRow icon={Calendar} label="Launch Date" value={formatDate(salon.launchDate)} />
            <DetailRow icon={Percent} label="Current Royalty" value={salon.currentRoyaltyPercentage != null ? `${salon.currentRoyaltyPercentage}%` : 'Not set'} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Firm & Owners</h2>
          {salon.firm ? (
            <div className="space-y-4">
              <DetailRow icon={Building2} label="Firm" value={salon.firm.legalName} />
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs text-ink-secondary font-medium">Owner(s)</p>
                  {salon.owners.length === 0 ? (
                    <p className="text-sm text-ink">—</p>
                  ) : (
                    salon.owners.map((o, i) => (
                      <p key={i} className="text-sm text-ink">
                        {o.fullName ?? 'Unnamed owner'} {o.isPrimary && <span className="text-xs text-brand-600 font-medium">(Primary)</span>}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-secondary">No firm currently assigned to this salon.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-secondary font-medium">{label}</p>
        <p className="text-sm text-ink mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
