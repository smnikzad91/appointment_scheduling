"use client";

import { useCallback } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listMySalonAppointments, updateAppointmentStatus } from "@/lib/api/ownerSalon";
import AppointmentsScreen from "@/components/app/AppointmentsScreen";
import { ListSkeleton } from "@/components/app/ui";

export default function SalonAppointmentsPage() {
  const token = useApiAccessToken();
  const load = useCallback(() => listMySalonAppointments(token!), [token]);
  const updateStatus = useCallback((id: string, status: Parameters<typeof updateAppointmentStatus>[2]) => updateAppointmentStatus(token!, id, status), [token]);

  if (!token) return <ListSkeleton />;
  return <AppointmentsScreen title="نوبت‌ها" showStylist load={load} updateStatus={updateStatus} />;
}
