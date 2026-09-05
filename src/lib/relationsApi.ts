import { request } from '@/lib/api';
import type { Relation } from '@/types';

interface RawRelation {
  id: number;
  name: string;
  relationType: Relation['relationType'];
  dateOfBirth?: string;
  anniversaryDate?: string;
  phone?: string;
}

function adaptRelation(r: RawRelation): Relation {
  return {
    id: String(r.id),
    name: r.name,
    relationType: r.relationType,
    dateOfBirth: r.dateOfBirth,
    anniversaryDate: r.anniversaryDate,
    phone: r.phone,
  };
}

export interface RelationInput {
  name: string;
  relationType: Relation['relationType'];
  dateOfBirth?: string;
  anniversaryDate?: string;
  phone?: string;
}

/** POST /api/v1/franchisees/:franchiseeId/relations — shared by self-service and admin. */
export async function createRelation(franchiseeId: string, input: RelationInput): Promise<Relation> {
  const data = await request<RawRelation>(`/franchisees/${franchiseeId}/relations`, {
    method: 'POST',
    body: input,
  });
  return adaptRelation(data);
}

export async function updateRelation(
  franchiseeId: string,
  relationId: string,
  input: Partial<RelationInput>,
): Promise<Relation> {
  const data = await request<RawRelation>(`/franchisees/${franchiseeId}/relations/${relationId}`, {
    method: 'PATCH',
    body: input,
  });
  return adaptRelation(data);
}

export async function deleteRelation(franchiseeId: string, relationId: string): Promise<void> {
  await request(`/franchisees/${franchiseeId}/relations/${relationId}`, { method: 'DELETE' });
}
