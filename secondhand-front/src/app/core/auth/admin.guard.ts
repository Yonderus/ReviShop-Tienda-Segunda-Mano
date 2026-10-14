import { CanMatchFn } from '@angular/router';

/** Abierto mientras no exista login; cuando lo haya comprobará AuthService.currentUser()?.role === 'admin'. */
export const adminGuard: CanMatchFn = () => true;
