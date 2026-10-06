import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@appointment-scheduling/database";
import { ROLES_KEY } from "../decorators/roles.decorator.js";
import { JwtPayload } from "../auth.service.js";

/**
 * An independent stylist runs their own one-person business: they own it (a Salon of kind
 * INDEPENDENT) and are its only stylist, so both owner and stylist routes are theirs.
 */
export function roleSatisfies(actual: Role, required: Role): boolean {
  if (actual === required) return true;
  return actual === Role.INDEPENDENT_STYLIST && (required === Role.SALON_OWNER || required === Role.STYLIST);
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (!user || !requiredRoles.some((role) => roleSatisfies(user.role, role))) {
      throw new ForbiddenException("Insufficient role");
    }

    return true;
  }
}
