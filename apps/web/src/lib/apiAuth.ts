import { apiFetch } from "./apiClient";

export type ApiRole = "PLATFORM_ADMIN" | "SALON_OWNER" | "STYLIST" | "CUSTOMER";

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

export function apiRegister(input: {
  phone: string;
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
}) {
  return apiFetch<ApiAuthResponse>("/auth/register-salon-owner", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
