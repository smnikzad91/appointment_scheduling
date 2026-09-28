export default function SectionHead({
  kicker,
  title,
  lead,
  center,
}: {
  kicker: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`g-reveal ${center ? "mx-auto max-w-2xl text-center" : ""}`}>
      <span className="g-kicker">{kicker}</span>
      <h2 className="mt-4 text-3xl font-black leading-snug text-g-ink sm:text-[40px]">{title}</h2>
      {lead && <p className="mt-4 text-[15px] leading-8 text-g-muted">{lead}</p>}
    </div>
  );
}
