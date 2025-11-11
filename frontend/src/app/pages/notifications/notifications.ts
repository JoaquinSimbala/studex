import { Component, OnInit, OnDestroy, inject, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { NotificationService, DbNotification } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { NotificationModalComponent } from '../../components/notification-modal/notification-modal.component';
import { BackButtonComponent } from '../../components/back-button/back-button.component';
import { Subscription } from 'rxjs';

/**
 * Componente de la página de notificaciones.
 * 
 * @description
 * Página completa que muestra todas las notificaciones del usuario con funcionalidad de:
 * - Listado paginado de notificaciones
 * - Filtrado por tipo (todas, no leídas, compras, ventas, proyectos)
 * - Marcar como leídas individual o masivamente
 * - Modal de detalles usando Angular CDK Overlay
 * - Carga infinita (load more)
 * 
 * @author Studex Team
 * @version 2.0.0
 * 
 * @example
 * ```typescript
 * // Uso en routing
 * {
 *   path: 'notifications',
 *   component: NotificationsComponent
 * }
 * ```
 * 
 * @implements {OnInit}
 * @implements {OnDestroy}
 */
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, OverlayModule, BackButtonComponent],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  
  /**
   * Servicio de notificaciones.
   * @private
   * @type {NotificationService}
   */
  private notificationService = inject(NotificationService);
  
  /**
   * Servicio de logging.
   * @private
   * @type {LoggerService}
   */
  private logger = inject(LoggerService);
  
  /**
   * Servicio de Angular CDK Overlay para renderizar el modal.
   * @private
   * @type {Overlay}
   */
  private overlay = inject(Overlay);
  
  /**
   * ViewContainerRef para crear portals dinámicamente.
   * @private
   * @type {ViewContainerRef}
   */
  private viewContainerRef = inject(ViewContainerRef);
  
  /**
   * Lista completa de notificaciones del usuario.
   * @type {DbNotification[]}
   * @public
   */
  notifications: DbNotification[] = [];
  
  /**
   * Lista de notificaciones filtradas según el filtro actual.
   * @type {DbNotification[]}
   * @public
   */
  filteredNotifications: DbNotification[] = [];
  
  /**
   * Contador de notificaciones no leídas.
   * @type {number}
   * @public
   */
  unreadCount = 0;
  
  /**
   * Contador de notificaciones recibidas hoy.
   * @type {number}
   * @public
   */
  todayCount = 0;
  
  /**
   * Estado de carga inicial de notificaciones.
   * @type {boolean}
   * @public
   */
  isLoading = false;
  
  /**
   * Estado de carga al cargar más notificaciones (paginación).
   * @type {boolean}
   * @public
   */
  isLoadingMore = false;
  
  /**
   * Estado de carga al marcar todas las notificaciones como leídas.
   * @type {boolean}
   * @public
   */
  isMarkingAllRead = false;
  
  /**
   * Notificación seleccionada para mostrar en el modal.
   * @type {DbNotification | null}
   * @public
   */
  selectedNotification: DbNotification | null = null;
  
  /**
   * Filtro actual aplicado a las notificaciones.
   * @type {'all' | 'unread' | 'compra_exitosa' | 'nueva_venta' | 'proyecto_subido' | 'compra_error'}
   * @public
   */
  currentFilter: 'all' | 'unread' | 'compra_exitosa' | 'nueva_venta' | 'proyecto_subido' | 'compra_error' = 'all';
  
  /**
   * Página actual de la paginación.
   * @type {number}
   * @public
   * @todo Implementar paginación real en el backend
   */
  currentPage = 1;
  
  /**
   * Cantidad de notificaciones por página.
   * @type {number}
   * @public
   * @todo Implementar paginación real en el backend
   */
  pageSize = 20;
  
  /**
   * Indica si hay más notificaciones para cargar.
   * @type {boolean}
   * @public
   * @todo Implementar paginación real en el backend
   */
  canLoadMore = true;

  /**
   * Array de suscripciones activas para limpiar en ngOnDestroy.
   * @private
   * @type {Subscription[]}
   */
  private subscriptions: Subscription[] = [];
  
  /**
   * Referencia al overlay del modal de notificaciones.
   * @private
   * @type {OverlayRef | null}
   */
  private modalOverlayRef: OverlayRef | null = null;

  /**
   * Inicializa el componente y carga las notificaciones.
   * 
   * @description
   * - Se suscribe a los observables de notificaciones y contador de no leídas
   * - Carga las notificaciones iniciales del servidor
   * - Configura la actualización automática de la lista filtrada
   * 
   * @returns {void}
   * @public
   */
  ngOnInit() {
    // Suscribirse a las notificaciones de la BD
    const dbNotificationsSub = this.notificationService.dbNotifications$.subscribe(
      notifications => {
        this.notifications = notifications;
        this.applyFilter();
      }
    );

    // Suscribirse al conteo de no leídas
    const unreadCountSub = this.notificationService.unreadCount$.subscribe(
      count => {
        this.unreadCount = count;
      }
    );

    this.subscriptions.push(dbNotificationsSub, unreadCountSub);

    // Cargar notificaciones iniciales
    this.loadNotifications();
  }

  /**
   * Limpia las suscripciones y recursos al destruir el componente.
   * 
   * @description
   * - Desuscribe todos los observables activos
   * - Limpia el overlay del modal si existe
   * - Previene memory leaks
   * 
   * @returns {void}
   * @public
   */
  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Limpiar modal overlay si existe
    if (this.modalOverlayRef) {
      this.modalOverlayRef.dispose();
      this.modalOverlayRef = null;
    }
  }

  /**
   * Carga las notificaciones desde el servidor.
   * 
   * @description
   * - Reinicia la paginación a la primera página
   * - Muestra estado de carga
   * - Carga las notificaciones del servicio
   * - Actualiza el contador de no leídas
   * - Determina si hay más notificaciones para cargar
   * 
   * @returns {void}
   * @public
   */
  loadNotifications() {
    this.isLoading = true;
    this.currentPage = 1;
    
    this.notificationService.loadDbNotifications().subscribe({
      next: () => {
        this.isLoading = false;
        this.canLoadMore = this.notifications.length >= this.pageSize;
      },
      error: (error) => {
        this.logger.error('Error cargando notificaciones', error);
        this.isLoading = false;
      }
    });

    // También cargar el conteo
    this.notificationService.loadUnreadCount().subscribe();
  }

  /**
   * Carga más notificaciones (paginación).
   * 
   * @description
   * - Previene múltiples cargas simultáneas
   * - Incrementa el número de página actual
   * - Carga las siguientes notificaciones del servidor
   * - Revierte el incremento de página en caso de error
   * 
   * @returns {void}
   * @public
   * 
   * @todo Implementar paginación real en el backend.
   * Actualmente solo simula la paginación y desactiva "cargar más" después de la primera carga.
   */
  loadMoreNotifications() {
    if (!this.canLoadMore || this.isLoadingMore) return;
    
    this.isLoadingMore = true;
    this.currentPage++;
    
    // Por ahora, simplemente cargar las notificaciones existentes
    // ya que el servicio actual no soporta paginación
    this.notificationService.loadDbNotifications().subscribe({
      next: () => {
        this.isLoadingMore = false;
        // Simular que no hay más para cargar por ahora
        this.canLoadMore = false;
      },
      error: (error) => {
        this.logger.error('Error cargando más notificaciones', error);
        this.isLoadingMore = false;
        this.currentPage--; // Revertir el incremento
      }
    });
  }

  /**
   * Establece el filtro actual y aplica el filtrado.
   * 
   * @description
   * Cambia el filtro activo y actualiza la lista de notificaciones visibles.
   * 
   * @param {typeof this.currentFilter} filter - El tipo de filtro a aplicar
   * @returns {void}
   * @public
   * 
   * @example
   * ```typescript
   * // Filtrar solo notificaciones no leídas
   * setFilter('unread');
   * 
   * // Mostrar todas las notificaciones
   * setFilter('all');
   * 
   * // Filtrar por tipo específico
   * setFilter('compra_exitosa');
   * ```
   */
  setFilter(filter: typeof this.currentFilter) {
    this.currentFilter = filter;
    this.applyFilter();
  }

  /**
   * Aplica el filtro actual a las notificaciones.
   * 
   * @description
   * - Filtra las notificaciones por usuario actual
   * - Aplica el filtro seleccionado (all, unread, o tipo específico)
   * - Actualiza la lista de notificaciones filtradas
   * - Calcula el contador de notificaciones de hoy
   * 
   * @returns {void}
   * @public
   * 
   * @remarks
   * Los tipos de notificación se comparan en mayúsculas ya que
   * el backend devuelve los tipos en uppercase.
   */
  applyFilter() {
    const currentUser = this.notificationService['authService'].getCurrentUser();
    const userId = currentUser ? Number(currentUser.id) : null;
    let filtered = userId !== null ? this.notifications.filter(n => n.usuarioId === userId) : [...this.notifications];

    if (this.currentFilter === 'all') {
      this.filteredNotifications = filtered;
    } else if (this.currentFilter === 'unread') {
      this.filteredNotifications = filtered.filter(n => !n.leida);
    } else {
      this.filteredNotifications = filtered.filter(n => n.tipo === this.currentFilter.toUpperCase());
    }
    
    // Calcular notificaciones de hoy
    this.calculateTodayCount(filtered);
  }

  /**
   * Calcula la cantidad de notificaciones recibidas hoy.
   * 
   * @description
   * Cuenta las notificaciones cuya fecha de creación corresponde al día actual.
   * 
   * @param {DbNotification[]} notifications - Lista de notificaciones a analizar
   * @returns {void}
   * @public
   */
  calculateTodayCount(notifications: DbNotification[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.todayCount = notifications.filter(notification => {
      const notificationDate = new Date(notification.fechaCreacion);
      notificationDate.setHours(0, 0, 0, 0);
      return notificationDate.getTime() === today.getTime();
    }).length;
  }

  /**
   * Abre el modal de detalles de una notificación usando CDK Overlay.
   * 
   * @description
   * - Selecciona la notificación a mostrar
   * - Marca como leída si no lo está
   * - Crea un overlay centrado globalmente usando Angular CDK
   * - Renderiza el componente NotificationModalComponent fuera del DOM del componente
   * - Suscribe a eventos del modal (cerrar, marcar como leída)
   * - Maneja el click en el backdrop para cerrar
   * 
   * @param {DbNotification} notification - La notificación a mostrar en el modal
   * @returns {void}
   * @public
   * 
   * @see {@link NotificationModalComponent}
   * @see {@link closeNotificationModal}
   */
  openNotificationModal(notification: DbNotification) {
    this.selectedNotification = notification;
    
    // Mark as read if not already read
    if (!notification.leida) {
      this.markAsRead(notification);
    }
    
    // Crear estrategia de posicionamiento global centrado
    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .centerVertically();

    // Crear configuración del overlay
    const overlayConfig = {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      panelClass: 'notification-modal-overlay'
    };

    // Crear el overlay
    this.modalOverlayRef = this.overlay.create(overlayConfig);

    // Crear el portal del componente
    const modalPortal = new ComponentPortal(
      NotificationModalComponent,
      this.viewContainerRef
    );

    // Adjuntar el portal al overlay
    const componentRef = this.modalOverlayRef.attach(modalPortal);

    // Pasar datos al componente
    componentRef.instance.notification = notification;

    // Suscribirse a los eventos del componente
    const closeSub = componentRef.instance.closeModalEvent.subscribe(() => {
      this.closeNotificationModal();
    });

    const markAsReadSub = componentRef.instance.markAsReadEvent.subscribe((notif: DbNotification) => {
      this.markAsRead(notif);
    });

    this.subscriptions.push(closeSub, markAsReadSub);

    // Suscribirse a clicks en el backdrop para cerrar
    const backdropSub = this.modalOverlayRef.backdropClick().subscribe(() => {
      this.closeNotificationModal();
    });

    this.subscriptions.push(backdropSub);
  }

  /**
   * Cierra el modal de notificación y limpia los recursos.
   * 
   * @description
   * - Destruye el overlay del modal
   * - Limpia la referencia al overlay
   * - Resetea la notificación seleccionada
   * 
   * @returns {void}
   * @public
   * 
   * @see {@link openNotificationModal}
   */
  closeNotificationModal() {
    if (this.modalOverlayRef) {
      this.modalOverlayRef.dispose();
      this.modalOverlayRef = null;
      this.selectedNotification = null;
    }
  }

  /**
   * Marca una notificación como leída.
   * 
   * @description
   * - Verifica que la notificación no esté ya leída
   * - Envía la petición al servidor
   * - Actualiza el estado local de la notificación
   * - Recarga el contador de no leídas
   * - Re-aplica el filtro para actualizar la vista
   * 
   * @param {DbNotification} notification - La notificación a marcar como leída
   * @returns {void}
   * @public
   * 
   * @example
   * ```typescript
   * // Marcar una notificación como leída
   * markAsRead(notification);
   * ```
   */
  markAsRead(notification: DbNotification) {
    if (!notification.leida) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          // Actualizar la notificación localmente
          notification.leida = true;
          notification.fechaLeida = new Date().toISOString();
          
          // Recargar el conteo
          this.notificationService.loadUnreadCount().subscribe();
          
          // Volver a aplicar el filtro para actualizar la vista
          this.applyFilter();
        },
        error: (error) => {
          this.logger.error('Error marcando como leída', error);
        }
      });
    }
  }

  /**
   * Marca una notificación como leída y cierra el modal.
   * 
   * @description
   * Método helper que combina marcar como leída y cerrar el modal.
   * 
   * @param {DbNotification} notification - La notificación a marcar como leída
   * @returns {void}
   * @public
   * 
   * @deprecated Este método no se está utilizando actualmente en el template.
   * El modal se cierra automáticamente via backdrop o botón de cierre.
   * Comentado para referencia futura.
   * 
   * @see {@link markAsRead}
   * @see {@link closeNotificationModal}
   */
  /*
  markAsReadAndClose(notification: DbNotification) {
    this.markAsRead(notification);
    this.closeNotificationModal();
  }
  */

  /**
   * Marca todas las notificaciones del usuario como leídas.
   * 
   * @description
   * - Muestra estado de carga durante la operación
   * - Envía petición masiva al servidor
   * - Actualiza todas las notificaciones localmente
   * - Resetea el contador de no leídas
   * - Re-aplica el filtro para actualizar la vista
   * - Maneja errores sin afectar el estado de la UI
   * 
   * @returns {void}
   * @public
   * 
   * @example
   * ```typescript
   * // Marcar todas como leídas desde un botón
   * <button (click)="markAllAsRead()">Marcar todas</button>
   * ```
   */
  markAllAsRead() {
    this.isMarkingAllRead = true;
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        // Marcar todas como leídas localmente
        this.notifications.forEach(n => {
          n.leida = true;
          n.fechaLeida = new Date().toISOString();
        });
        
        // Actualizar conteo
        this.unreadCount = 0;
        this.isMarkingAllRead = false;
        
        // Recargar conteo del servicio
        this.notificationService.loadUnreadCount().subscribe();
        
        // Volver a aplicar el filtro
        this.applyFilter();
      },
      error: (error) => {
        this.logger.error('Error marcando todas como leídas', error);
        this.isMarkingAllRead = false;
      }
    });
  }

  /**
   * Formatea una fecha en formato legible en español.
   * 
   * @description
   * Convierte una fecha ISO string a formato español con fecha completa y hora.
   * 
   * @param {string} dateString - Fecha en formato ISO string
   * @returns {string} Fecha formateada (ej: "28 de octubre de 2025, 14:30")
   * @public
   * 
   * @example
   * ```typescript
   * const formatted = getFormattedDate("2025-10-28T14:30:00Z");
   * // Returns: "28 de octubre de 2025, 14:30"
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

  /**
   * Verifica si una notificación tiene datos extra relevantes.
   * 
   * @description
   * Comprueba si el objeto datosExtra contiene información adicional
   * como proyecto, monto, método de pago, comprador o vendedor.
   * 
   * @param {any} datosExtra - Objeto con datos adicionales de la notificación
   * @returns {boolean} true si tiene datos extra relevantes, false en caso contrario
   * @public
   * 
   * @example
   * ```typescript
   * const hasData = hasExtraData(notification.datosExtra);
   * if (hasData) {
   *   // Mostrar información adicional
   * }
   * ```
   */
  hasExtraData(datosExtra: any): boolean {
    if (!datosExtra) return false;
    return !!(datosExtra.proyecto || datosExtra.monto || datosExtra.metodoPago || datosExtra.comprador || datosExtra.vendedor);
  }

  /**
   * Convierte una fecha en texto relativo (hace X tiempo).
   * 
   * @description
   * Calcula el tiempo transcurrido desde una fecha y devuelve texto legible
   * como "Hace 5 min", "Hace 2 h", "Hace 3 días", etc.
   * 
   * @param {string} dateString - Fecha en formato ISO string
   * @returns {string} Tiempo relativo en español
   * @public
   * 
   * @deprecated Este método no se está utilizando actualmente en el template.
   * Se usa getFormattedDate() para mostrar fechas completas.
   * Comentado para referencia futura.
   * 
   * @example
   * ```typescript
   * const timeAgo = getTimeAgo("2025-10-28T14:30:00Z");
   * // Puede retornar: "Hace 5 min", "Hace 2 h", "Hace 3 días"
   * ```
   */
  /*
  getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return date.toLocaleDateString();
  }
  */
}