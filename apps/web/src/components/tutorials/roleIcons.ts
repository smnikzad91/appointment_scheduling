import { Scissors, Store, UserRound } from "lucide-react";

// Shared by the server article page and the client index (not in a "use client" file, so the
// server side gets the real components).
export const ROLE_ICON = { owner: Store, stylist: Scissors, customer: UserRound } as const;
