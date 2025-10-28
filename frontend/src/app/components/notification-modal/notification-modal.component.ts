import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbNotification } from '../../services/notification.service';

/**
 * Componente modal de notificación.
 * 
 * Modal centrado que muestra los detalles completos de una notificación individual.
 * Se abre al hacer clic en una notificación del dropdown.
 * 
 * @description
 * - Muestra header con gradiente según tipo de notificación
 * - Muestra mensaje completo y datos adicionales (proyecto, monto, método de pago)
 * - Permite marcar notificación como leída
 * - Se cierra al hacer clic fuera o en botón cerrar
 * - Totalmente responsive y centrado en pantalla
 * 
 * @example
 * ```html
 * <app-notification-modal 
 *   *ngIf="selectedNotification"
 *   [notification]="selectedNotification"
 *   (closeModalEvent)="closeNotificationModal()"
 *   (markAsReadEvent)="markAsRead($event)">
 * </app-notification-modal>
 * ```
 * 
 * @author Studex Platform
 * @version 1.0.0
 */
@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-modal.component.html',
  styleUrls: ['./notification-modal.component.scss']
})
export class NotificationModalComponent {
  
  /**
   * Notificación a mostrar en el modal.
   * @type {DbNotification | null}
   * @input
   * @public
   */
  @Input() notification: DbNotification | null = null;
  
  /**
   * Evento emitido al cerrar el modal.
   * @type {EventEmitter<void>}
   * @output
   * @public
   */
  @Output() closeModalEvent = new EventEmitter<void>();
  
  /**
   * Evento emitido al marcar una notificación como leída.
   * @type {EventEmitter<DbNotification>}
   * @output
   * @public
   */
  @Output() markAsReadEvent = new EventEmitter<DbNotification>();

  /**
   * Cierra el modal emitiendo el evento closeModalEvent.
   * 
   * @description
   * Emite un evento vacío para notificar al componente padre que cierre el modal.
   * El componente padre (notifications-dropdown) maneja el cierre limpiando selectedNotification.
   * 
   * @returns {void}
   * @public
   */
  close(): void {
    this.closeModalEvent.emit();
  }

  /**
   * Marca una notificación como leída y cierra el modal.
   * 
   * @description
   * - Verifica que la notificación exista y no esté ya leída
   * - Emite evento markAsReadEvent al componente padre
   * - Cierra el modal automáticamente
   * - El componente padre maneja la petición HTTP al servidor
   * 
   * @param {DbNotification} [notification] - Notificación a marcar como leída (opcional)
   * @returns {void}
   * @public
   */
  markAsReadAndClose(notification?: DbNotification): void {
    if (notification && !notification.leida) {
      this.markAsReadEvent.emit(notification);
    }
    this.close();
  }

  /**
   * Verifica si la notificación tiene datos adicionales para mostrar.
   * 
   * @description
   * Revisa si el objeto datosExtra contiene alguno de los siguientes campos:
   * - proyecto: Información del proyecto relacionado
   * - monto: Cantidad en moneda
   * - metodoPago: Método de pago utilizado
   * - comprador: Datos del comprador
   * - vendedor: Datos del vendedor
   * 
   * @param {any} datosExtra - Objeto con datos adicionales de la notificación
   * @returns {boolean} true si hay datos adicionales para mostrar, false en caso contrario
   * @public
   * 
   * @example
   * ```typescript
   * hasExtraData({ proyecto: { titulo: "Mi Proyecto" }, monto: 50 }) // true
   * hasExtraData({}) // false
   * hasExtraData(null) // false
   * ```
   */
  hasExtraData(datosExtra: any): boolean {
    if (!datosExtra) return false;
    return !!(datosExtra.proyecto || datosExtra.monto || datosExtra.metodoPago || datosExtra.comprador || datosExtra.vendedor);
  }

  /**
   * Formatea un monto numérico a moneda peruana (PEN).
   * 
   * @description
   * Convierte un número a formato de moneda con símbolo de soles peruanos (S/).
   * Utiliza el locale es-PE para formato correcto.
   * 
   * @param {number} monto - Monto numérico a formatear
   * @returns {string} Monto formateado como moneda (ej: "S/ 50.00")
   * @public
   * 
   * @example
   * ```typescript
   * formatCurrency(50) // "S/ 50.00"
   * formatCurrency(1500.50) // "S/ 1,500.50"
   * ```
   */
  formatCurrency(monto: number): string {
    return monto ? monto.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' }) : '';
  }

  /**
   * Obtiene el nombre legible de un método de pago.
   * 
   * @description
   * Convierte códigos de métodos de pago a nombres amigables:
   * - YAPE → "Yape"
   * - PLIN → "Plin"
   * - BANCARIO → "Transferencia Bancaria"
   * - Otros → Retorna el código original
   * 
   * @param {string} method - Código del método de pago
   * @returns {string} Nombre legible del método de pago
   * @public
   * 
   * @example
   * ```typescript
   * getPaymentMethodName('YAPE') // "Yape"
   * getPaymentMethodName('PLIN') // "Plin"
   * getPaymentMethodName('BANCARIO') // "Transferencia Bancaria"
   * getPaymentMethodName('OTRO') // "OTRO"
   * ```
   */
  getPaymentMethodName(method: string): string {
    const methods: Record<string, string> = {
      'YAPE': 'Yape',
      'PLIN': 'Plin',
      'BANCARIO': 'Transferencia Bancaria'
    };
    return methods[method] || method;
  }

  /**
   * Formatea una fecha ISO string a formato legible en español.
   * 
   * @description
   * Convierte una fecha ISO 8601 a formato: "día de mes de año, HH:MM"
   * Ejemplo: "27 de octubre de 2025, 14:30"
   * 
   * @param {string} dateString - Fecha en formato ISO 8601
   * @returns {string} Fecha formateada en español con hora
   * @public
   * 
   * @example
   * ```typescript
   * getFormattedDate('2025-10-27T14:30:00Z') // "27 de octubre de 2025, 14:30"
   * ```
   */
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