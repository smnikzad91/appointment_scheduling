"use client";

import { useCallback } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listMyAppointments, updateMyAppointmentStatus } from "@/lib/api/stylistSelf";
import AppointmentsScreen from "@/components/app/AppointmentsScreen";
import { ListSkeleton } from "@/components/app/ui";

export default function StylistAppointmentsPage() {
  const token = useApiAccessToken();
  const load = useCallback(() => listMyAppointments(token!), [token]);
  const updateStatus = useCallback((id: string, status: Parameters<typeof updateMyAppointmentStatus>[2]) => updateMyAppointmentStatus(token!, id, status), [token]);

  if (!token) return <ListSkeleton />;
  return <AppointmentsScreen title="نوبت‌های من" load={load} updateStatus={updateStatus} />;
}
