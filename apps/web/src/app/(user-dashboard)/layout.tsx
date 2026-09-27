import { CustomerShell } from "@/components/app/panels";
import { WalletProvider } from "@/context/WalletContext";

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <CustomerShell>{children}</CustomerShell>
    </WalletProvider>
  );
}
