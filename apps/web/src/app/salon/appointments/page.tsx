"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listMySalonAppointments, updateAppointmentStatus } from "@/lib/api/ownerSalon";
import AppointmentsScreen from "@/components/app/AppointmentsScreen";
import SalonBookingSheet from "@/components/app/SalonBookingSheet";
import { IconButton, ListSkeleton } from "@/components/app/ui";

export default function SalonAppointmentsPage() {
  const token = useApiAccessToken();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingKey, setBookingKey] = useState(0); // new key → a fresh, empty booking form
  // Bumped after the salon books someone, so the list reloads.
  const [version, setVersion] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => listMySalonAppointments(token!), [token, version]);
  const updateStatus = useCallback((id: string, status: Parameters<typeof updateAppointmentStatus>[2]) => updateAppointmentStatus(token!, id, status), [token]);

  if (!token) return <ListSkeleton />;
  return (
    <>
      <AppointmentsScreen
        title="نوبت‌ها"
        showStylist
        edit={{ token }}
        load={load}
        updateStatus={updateStatus}
        headerAction={
          <IconButton
            icon={Plus}
            label="ثبت نوبت برای مشتری"
            onClick={() => {
              setBookingKey((k) => k + 1);
              setBookingOpen(true);
            }}
          />
        }
      />
      <SalonBookingSheet key={bookingKey} token={token} open={bookingOpen} onClose={() => setBookingOpen(false)} onCreated={() => setVersion((v) => v + 1)} />
    </>
  );
}
