import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

export interface SseMessage {
  event: string;
  data: any;
}

@Injectable({ providedIn: 'root' })
export class SseService implements OnDestroy {
  private readonly sseUrl = environment.sseUrl;
  private eventSource: EventSource | null = null;
  private readonly messages = new Subject<SseMessage>();
  private readonly connected = new Subject<boolean>();
  private reconnectTimer: any = null;
  private closedByUser = false;

  constructor(private readonly auth: AuthService) {}

  connect(): void {
    const token = this.auth.getToken();
    if (!token || this.eventSource) {
      return;
    }
    this.closedByUser = false;
    const url = `${this.sseUrl}?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    this.eventSource = es;

    es.addEventListener('open', () => this.connected.next(true));
    es.addEventListener('error', () => {
      this.connected.next(false);
      this.scheduleReconnect();
    });

    const forward = (e: MessageEvent) => {
      let data: any = e.data;
      try {
        data = JSON.parse(e.data);
      } catch {
        // keep raw string
      }
      this.messages.next({ event: e.type, data });
    };
    // Default 'message' + named events produced by the backend.
    const eventNames = ['message', 'connected', 'execution.started', 'execution.resumed',
      'execution.waiting', 'execution.completed', 'execution.failed', 'execution.cancelled',
      'step.completed', 'mission.running', 'mission.waiting', 'mission.completed',
      'mission.failed', 'mission.cancelled'];
    for (const name of eventNames) {
      es.addEventListener(name, forward);
    }
  }

  private scheduleReconnect(): void {
    if (this.closedByUser || this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.eventSource?.close();
      this.eventSource = null;
      this.connect();
    }, 5000);
  }

  onMessage(): Observable<SseMessage> {
    return this.messages.asObservable();
  }

  isConnected(): Observable<boolean> {
    return this.connected.asObservable();
  }

  disconnect(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.eventSource?.close();
    this.eventSource = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.messages.complete();
    this.connected.complete();
  }
}
