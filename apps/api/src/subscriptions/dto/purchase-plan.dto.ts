import { IsIn, IsString } from "class-validator";

export const PURCHASE_MONTHS = [1, 3, 6, 12] as const;

export class PurchasePlanDto {
  @IsString()
  planId!: string;

  @IsIn(PURCHASE_MONTHS)
  months!: (typeof PURCHASE_MONTHS)[number];
}
