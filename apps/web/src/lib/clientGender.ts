/**
 * Who a salon or independent stylist serves (apps/api Salon.clientGender): picked at sign-up, editable in
 * settings and by the admin; customers filter the search by it. null = not set yet (older businesses) —
 * the search lists those under both filters.
 */
export type ClientGender = "MEN" | "WOMEN";

export const CLIENT_GENDERS: ClientGender[] = ["WOMEN", "MEN"];

/** «بانوان» / «آقایان» — the choice itself. */
export const CLIENT_GENDER_LABEL: Record<ClientGender, string> = { WOMEN: "بانوان", MEN: "آقایان" };

/** On cards and the salon page: «ویژه بانوان» / «ویژه آقایان». */
export const CLIENT_GENDER_BADGE: Record<ClientGender, string> = { WOMEN: "ویژه بانوان", MEN: "ویژه آقایان" };

/** ?gender=women|men in the search URL. */
export const genderFromParam = (v?: string | null): ClientGender | undefined => (v === "women" ? "WOMEN" : v === "men" ? "MEN" : undefined);
export const genderToParam = (g?: ClientGender | "" | null) => (g === "WOMEN" ? "women" : g === "MEN" ? "men" : "");
