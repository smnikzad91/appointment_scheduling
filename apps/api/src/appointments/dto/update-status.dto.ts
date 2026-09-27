import { IsIn } from "class-validator";

const UPDATABLE_STATUSES = ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
export type UpdatableAppointmentStatus = (typeof UPDATABLE_STATUSES)[number];

export class UpdateAppointmentStatusDto {
  @IsIn(UPDATABLE_STATUSES)
  status!: UpdatableAppointmentStatus;
}
