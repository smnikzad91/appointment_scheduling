import { salonApiFetch } from "./salonApiClient";

// Review moderation (apps/api src/reviews). Customer reviews start PENDING and only APPROVED ones
// are public. The salon owner sees every review of the salon (salon + stylist reviews); a stylist
// sees the reviews about them. Either can approve or hide (reject) what they see.

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ReviewScope = "salon" | "stylist";

export interface ModerationReview {
  id: string;
  target: "SALON" | "STYLIST";
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  moderatedAt: string | null;
  stylist: { id: string; displayName: string } | null;
  customerName: string;
  appointment: { startAt: string; services: string[] };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export function listReviewsForModeration(token: string, scope: ReviewScope, status?: ReviewStatus) {
  const path = scope === "salon" ? "/salons/mine/reviews" : "/stylists/me/reviews";
  return salonApiFetch<ModerationReview[]>(status ? `${path}?status=${status}` : path, { headers: auth(token) });
}

export function moderateReview(token: string, id: string, status: Exclude<ReviewStatus, "PENDING">) {
  return salonApiFetch<ModerationReview>(`/reviews/${id}/status`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ status }),
  });
}
