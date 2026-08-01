import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface KarmaUiAction {
  type: string;
  params?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class KarmaActionService {
  private readonly actions = new Subject<KarmaUiAction>();

  readonly onAction = this.actions.asObservable();

  dispatch(action: KarmaUiAction): void {
    if (action && action.type) {
      this.actions.next(action);
    }
  }
}
