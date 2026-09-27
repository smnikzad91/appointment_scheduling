import Skeleton from "@/components/salon/Skeleton";

export default function SalonLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Skeleton className="h-40 w-full sm:h-56" />
      <div className="mt-4 flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="mt-8 flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
