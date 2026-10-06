import { Metadata } from "next";
import AdminAppReleases from "@/components/admin/AdminAppReleases";

export const metadata: Metadata = { title: "App releases | Admin" };

export default function AppReleasesPage() {
  return <AdminAppReleases />;
}
