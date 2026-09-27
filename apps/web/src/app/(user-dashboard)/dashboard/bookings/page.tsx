"use client";

import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import CustomerBookings from "@/components/app/CustomerBookings";

export default function CustomerBookingsPage() {
  return <CustomerBookings token={useApiAccessToken()} />;
}
