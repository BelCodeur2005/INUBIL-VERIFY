import { Injectable, signal } from '@angular/core';

// Structure locale pour les messages d'alerte(notifications toast)
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private counter = 0;

  success(message: string) { this.add('success', message); }
  error(message: string)   { this.add('error', message); }
  info(message: string)    { this.add('info', message); }
  warning(message: string) { this.add('warning', message); }

  remove(id: number) {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  private add(type: ToastType, message: string) {
    const id = ++this.counter;
    this._toasts.update(list => [...list, { id, type, message }]);
    setTimeout(() => this.remove(id), 4000);
  }
}
