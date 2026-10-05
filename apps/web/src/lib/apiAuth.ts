import { apiFetch } from "./apiClient";

export type ApiRole = "PLATFORM_ADMIN" | "SALON_OWNER" | "STYLIST" | "CUSTOMER" | "INDEPENDENT_STYLIST";

export interface ApiAuthUser {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: ApiRole;
  createdAt: string;
}

export interface ApiAuthResponse {
  accessToken: string;
  user: ApiAuthUser;
}

export function apiLogin(identifier: string, password: string) {
  return apiFetch<ApiAuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

/** Signs in with an SMS code (requested via /auth/otp/request). 404 = no account for this phone. */
export function apiVerifyOtp(phone: string, code: string) {
  return apiFetch<ApiAuthResponse>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export function apiRegister(input: {
  phone: string;
  /** SMS code confirming the phone (requestOtp purpose "register") */
  code: string;
  email?: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  return apiFetch<ApiAuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function apiRegisterSalonOwner(input: {
  phone: string;
  /** SMS code confirming the phone (requestOtp purpose "register") */
  code: string;
  email?: string;
  password: string;
  firstName: string;
  lastName: string;
  salonName: string;
  province: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  salonPhone?: string;
  planId?: string;
  /** An independent stylist's own business (salonName = their business/display name). */
  kind?: "SALON" | "INDEPENDENT";
  serviceLocations?: string[];
  serviceArea?: string;
  hostSalonName?: string;
}) {
  return apiFetch<ApiAuthResponse>("/auth/register-salon-owner", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
