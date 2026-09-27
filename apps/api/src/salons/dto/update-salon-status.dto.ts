import { IsIn } from "class-validator";

const SALON_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const;

export class UpdateSalonStatusDto {
  @IsIn(SALON_STATUSES)
  status!: (typeof SALON_STATUSES)[number];
}
