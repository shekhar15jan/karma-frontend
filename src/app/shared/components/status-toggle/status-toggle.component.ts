import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-status-toggle',
  standalone: true,
  template: `
    <button type="button" role="switch" [attr.aria-checked]="checked" [disabled]="disabled"
            class="switch-root" [class.on]="checked"
            (click)="toggle()">
      <span class="switch-track">
        <span class="switch-thumb"></span>
      </span>
      <span class="switch-label">{{ label || (checked ? 'Active' : 'Inactive') }}</span>
    </button>
  `,
  styleUrls: ['./status-toggle.component.scss'],
})
export class StatusToggleComponent {
  @Input() checked = false;
  @Input() label = '';
  @Input() disabled = false;
  @Output() toggled = new EventEmitter<boolean>();

  toggle(): void {
    if (this.disabled) return;
    this.toggled.emit(!this.checked);
  }
}