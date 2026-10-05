import { IsIn, IsOptional } from "class-validator";

const UPDATABLE_STATUSES = ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
export type UpdatableAppointmentStatus = (typeof UPDATABLE_STATUSES)[number];

export class UpdateAppointmentStatusDto {
  @IsIn(UPDATABLE_STATUSES)
  status!: UpdatableAppointmentStatus;

  /** COMPLETED only: how the rest of the price is received — on site (default) or from the customer's wallet. */
  @IsOptional()
  @IsIn(["ON_SITE", "WALLET"])
  balanceMethod?: "ON_SITE" | "WALLET";
}
