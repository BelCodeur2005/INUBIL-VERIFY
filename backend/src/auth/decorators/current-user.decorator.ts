import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * Injecte l'utilisateur courant (pose sur la requete par la JwtStrategy).
 *
 * @example
 * maRoute(@CurrentUser() user: AuthenticatedUser) {}
 * maRoute(@CurrentUser('id') userId: string) {}
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
