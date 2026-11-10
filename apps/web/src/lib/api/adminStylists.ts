import { salonApiFetch } from "./salonApiClient";

export type StylistApproval = "PENDING" | "APPROVED" | "REJECTED";

/** A stylist a salon invited, waiting for (or past) the platform admin's approval. */
export interface AdminStylist {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  active: boolean;
  approval: StylistApproval;
  approvalDecidedAt: string | null;
  createdAt: string;
  /** mustSetPassword: hasn't used their "set your password" link yet. */
  user: { firstName: string; lastName: string; phone: string | null; mustSetPassword: boolean };
  salon: {
    id: string;
    name: string;
    city: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
    owner: { firstName: string; lastName: string; phone: string | null };
  };
}

export function listAdminStylists(token: string, approval?: StylistApproval) {
  const qs = approval ? `?approval=${approval}` : "";
  return salonApiFetch<AdminStylist[]>(`/admin/stylists${qs}`, { headers: { Authorization: `Bearer ${token}` } });
}

/** Approve (switched on when the salon's plan has a seat — see `active` in the reply) or reject. */
export function setStylistApproval(token: string, id: string, approval: "APPROVED" | "REJECTED") {
  return salonApiFetch<{ id: string; approval: StylistApproval; active: boolean }>(`/admin/stylists/${id}/approval`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ approval }),
  });
}
