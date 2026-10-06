"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listMyAppointments, updateMyAppointmentStatus } from "@/lib/api/stylistSelf";
import AppointmentsScreen from "@/components/app/AppointmentsScreen";
import SalonBookingSheet from "@/components/app/SalonBookingSheet";
import { IconButton, ListSkeleton } from "@/components/app/ui";

export default function StylistAppointmentsPage() {
  const token = useApiAccessToken();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingKey, setBookingKey] = useState(0); // new key → a fresh, empty booking form
  // Bumped after the stylist books someone, so the list reloads.
  const [version, setVersion] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => listMyAppointments(token!), [token, version]);
  const updateStatus = useCallback((id: string, status: Parameters<typeof updateMyAppointmentStatus>[2]) => updateMyAppointmentStatus(token!, id, status), [token]);

  if (!token) return <ListSkeleton />;
  return (
    <>
      <AppointmentsScreen
        title="نوبت‌های من"
        edit={{ token, asStylist: true }}
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
      <SalonBookingSheet
        key={bookingKey}
        asStylist
        token={token}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onCreated={() => setVersion((v) => v + 1)}
      />
    </>
  );
}
