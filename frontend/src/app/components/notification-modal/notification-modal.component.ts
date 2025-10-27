import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, DbNotification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-modal.component.html',
  styleUrls: ['./notification-modal.component.scss']
})
export class NotificationModalComponent {
  @Input() notification: DbNotification | null = null;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() markAsReadEvent = new EventEmitter<DbNotification>();

  private notificationService = inject(NotificationService);

  close() {
    this.closeModalEvent.emit();
  }

  markAsReadAndClose(notification?: DbNotification) {
    if (notification && !notification.leida) {
      this.markAsReadEvent.emit(notification);
    }
    this.close();
  }

  hasExtraData(datosExtra: any): boolean {
    if (!datosExtra) return false;
    return !!(datosExtra.proyecto || datosExtra.monto || datosExtra.metodoPago || datosExtra.comprador || datosExtra.vendedor);
  }

  formatCurrency(monto: number): string {
    return monto ? monto.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' }) : '';
  }

  getPaymentMethodName(method: string): string {
    const methods: Record<string, string> = {
      'YAPE': 'Yape',
      'PLIN': 'Plin',
      'BANCARIO': 'Transferencia Bancaria'
    };
    return methods[method] || method;
  }

  getFormattedDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}