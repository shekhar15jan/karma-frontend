import { Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { ApiService } from './api.service';
import { Catalogue } from '../models/catalogue.model';

@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private cached$: Observable<Catalogue> | null = null;

  constructor(private readonly api: ApiService) {}

  /** The catalogue is static per deploy (it's source code, not user data) — cache the
   *  first successful load for the lifetime of the app instead of refetching on every
   *  page visit. */
  get(): Observable<Catalogue> {
    if (!this.cached$) {
      this.cached$ = this.api.get<Catalogue>('/v1/catalogue').pipe(
        map((r) => r.data),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.cached$;
  }
}
