import { ExpenseCategory, PayoutMethod } from "@appointment-scheduling/database";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

const MAX_AMOUNT = 2_000_000_000; // fits Postgres INTEGER; far above any single salon transaction

/** A reporting window: [from, to). Clients send the salon-local day/month boundaries as instants. */
export class PeriodQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  stylistId?: string;
}

export class AdjustChargeDto {
  /** What the customer actually paid (discount, extra service…). */
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  chargedToman!: number;

  /** Tip for the stylist on top of the price (all theirs). Omit to keep it; 0 or null clears it. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  tipToman?: number | null;
}

export class CreatePayoutDto {
  @IsString()
  stylistId!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amountToman!: number;

  @IsEnum(PayoutMethod)
  method!: PayoutMethod;

  /** Defaults to now. */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amountToman!: number;

  /** Defaults to now. */
  @IsOptional()
  @IsDateString()
  spentAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amountToman?: number;

  @IsOptional()
  @IsDateString()
  spentAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string | null;
}

export class PayoutQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  stylistId?: string;
}
