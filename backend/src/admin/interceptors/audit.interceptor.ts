import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const METHODES_IGNOREES = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Intercepteur appliqué au module admin : logue automatiquement toutes les mutations
 * (POST/PATCH/PUT/DELETE) dans le journal_audit.
 * Utilisé comme UseInterceptors sur AdminController - pas global pour éviter le bruit.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      ip?: string;
      headers: Record<string, string>;
      user?: AuthenticatedUser;
      route?: { path: string };
    }>();

    if (METHODES_IGNOREES.has(req.method)) {
      return next.handle();
    }

    const user = req.user;
    const route = req.route?.path ?? req.url;
    const action = `ADMIN_${req.method}_${route.replace(/[/:]/g, '_').replace(/^_+/, '').toUpperCase()}`;

    return next.handle().pipe(
      tap(() => {
        this.audit
          .log({
            utilisateurId: user?.id,
            nomUtilisateur: user?.email,
            action,
            module: 'admin',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          })
          .catch((err) => this.logger.warn(`Audit interceptor failed: ${String(err)}`));
      }),
    );
  }
}
