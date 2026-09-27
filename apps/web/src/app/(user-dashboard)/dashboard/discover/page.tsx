import SalonSearch from "@/components/discovery/SalonSearch";
import { PageHeader } from "@/components/app/ui";

export default function CustomerDiscoverPage() {
  return (
    <>
      <PageHeader title="کشف سالن" subtitle="نزدیک‌ترین یا بهترین سالن‌ها را پیدا کنید" />
      <SalonSearch />
    </>
  );
}
