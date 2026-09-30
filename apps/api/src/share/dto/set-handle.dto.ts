import { IsString, MaxLength } from "class-validator";

export class SetHandleDto {
  /** With or without a leading @; checked against HANDLE_PATTERN in the service. */
  @IsString()
  @MaxLength(40)
  handle!: string;
}
