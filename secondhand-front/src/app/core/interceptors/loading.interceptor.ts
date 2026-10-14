import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { BLOCKING_REQUEST, SKIP_GLOBAL_LOADER } from '../config/api.tokens';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_GLOBAL_LOADER)) return next(req);

  const loading = inject(LoadingService);
  const kind = req.context.get(BLOCKING_REQUEST) ? 'blocking' : 'background';
  loading.start(kind);
  return next(req).pipe(finalize(() => loading.stop(kind)));
};
