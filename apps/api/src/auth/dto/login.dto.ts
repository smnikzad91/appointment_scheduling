import { IsString } from "class-validator";

export class LoginDto {
  // Phone number or email — whichever the user signs in with.
  @IsString()
  identifier!: string;

  @IsString()
  password!: string;
}
