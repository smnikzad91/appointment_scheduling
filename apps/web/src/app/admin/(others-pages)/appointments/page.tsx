import { Metadata } from "next";
import AdminAppointments from "@/components/admin/AdminAppointments";

export const metadata: Metadata = { title: "Appointments | Admin" };

export default function AdminAppointmentsPage() {
  return <AdminAppointments />;
}
