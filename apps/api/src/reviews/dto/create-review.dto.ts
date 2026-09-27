import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { ReviewStatus, ReviewTarget } from "@appointment-scheduling/database";

export const REVIEW_COMMENT_MAX = 500;

export class CreateReviewDto {
  /** What the review is about: the salon (default) or the appointment's stylist. */
  @IsOptional()
  @IsIn([ReviewTarget.SALON, ReviewTarget.STYLIST])
  target?: ReviewTarget;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(REVIEW_COMMENT_MAX)
  comment?: string;
}

export class ListReviewsQueryDto {
  @IsOptional()
  @IsIn([ReviewStatus.PENDING, ReviewStatus.APPROVED, ReviewStatus.REJECTED])
  status?: ReviewStatus;
}

export class ModerateReviewDto {
  @IsIn([ReviewStatus.APPROVED, ReviewStatus.REJECTED])
  status!: ReviewStatus;
}
