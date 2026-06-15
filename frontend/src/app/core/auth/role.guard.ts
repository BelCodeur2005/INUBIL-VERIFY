import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../models/user.model';

export const roleGuard = (rolesAutorises: Role[]): CanActivateFn => () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const role = auth.role();
  if (role && rolesAutorises.includes(role)) return true;

  router.navigate(['/403']);
  return false;
};
