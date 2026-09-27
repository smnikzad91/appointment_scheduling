"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type WalletContextType = {
  balance: number | null;
  setBalance: (balance: number) => void;
  refresh: () => void;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => { if (typeof d.walletBalance === "number") setBalance(d.walletBalance); })
      .catch(() => {});
  }, []);

  useEffect(() => { queueMicrotask(refresh); }, [refresh]);

  return (
    <WalletContext.Provider value={{ balance, setBalance, refresh }}>
      {children}
    </WalletContext.Provider>
  );
};
