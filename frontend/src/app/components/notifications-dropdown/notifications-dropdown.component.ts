import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { NotificationService, DbNotification } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { NotificationModalComponent } from '../notification-modal/notification-modal.component';
import { Subscription } from 'rxjs';

/**
 * Componente dropdown de notificaciones.
 * 
 * Muestra un icono de campana en el navbar con badge de notificaciones no leídas.
 * Al hacer clic, despliega un panel flotante con la lista de notificaciones recientes.
 * 
 * @description
 * - Desktop (≥640px): Dropdown absolute con hover management
 * - Móvil (<640px): Fixed overlay desde top: 80px
 * - Muestra las últimas notificaciones de la base de datos
 * - Contador de notificaciones no leídas en badge rojo
 * - Permite marcar notificaciones individuales como leídas
 * - Permite marcar todas las notificaciones como leídas
 * - Abre modal con detalles de cada notificación
 * - Navegación a vista completa de notificaciones
 * 
 * @example
 * ```html
 * <app-notifications-dropdown></app-notifications-dropdown>
 * ```
 * 
 * @author Studex Platform
 * @version 3.0.0
 */
@Component({
  selector: 'app-notifications-dropdown',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './notifications-dropdown.component.html',
  styleUrls: ['./notifications-dropdown.component.scss']
})
export class NotificationsDropdownComponent implements OnInit, OnDestroy {
  
  /** Evento para notificar al navbar que cierre otros menús en móvil */
  @Output() closeOtherMenus = new EventEmitter<void>();
  
  /** Servicio de notificaciones inyectado */
  private notificationService = inject(NotificationService);
  
  /** Servicio de logging inyectado */
  private logger = inject(LoggerService);
  
  /** Router de Angular para navegación */
  private router = inject(Router);
  
  /** Overlay service de Angular CDK (solo para modal) */
  private overlay = inject(Overlay);
  
  /** Referencia al overlay del modal */
  private modalOverlayRef: OverlayRef | null = null;
  
  /** Referencia al botón de notificaciones */
  @ViewChild('notificationButton', { read: ElementRef }) notificationButton!: ElementRef;
  
  /**
   * Lista de notificaciones de la base de datos.
   * @type {DbNotification[]}
   * @public
   */
  notifications: DbNotification[] = [];
  
  /**
   * Contador de notificaciones no leídas.
   * @type {number}
   * @public
   */
  unreadCount = 0;
  
  /**
   * Estado de apertura del dropdown.
   * @type {boolean}
   * @public
   */
  isOpen = false;
  
  /**
   * Estado de carga de notificaciones.
   * @type {boolean}
   * @public
   */
  isLoading = false;
  
  /**
   * Estado de carga al marcar todas como leídas.
   * @type {boolean}
   * @public
   */
  isMarkingAllRead = false;
  
  /**
   * Notificación seleccionada para mostrar en modal.
   * @type {DbNotification | null}
   * @public
   */
  selectedNotification: DbNotification | null = null;

  /**
   * Array de suscripciones a observables para limpieza en ngOnDestroy.
   * @type {Subscription[]}
   * @private
   */
  private subscriptions: Subscription[] = [];

  /**
   * Timeout para manejo del hover en desktop.
   * @type {any}
   * @private
   */
  private dropdownTimeout: any = null;

  /**
   * Inicializa el componente y establece suscripciones.
   * 
   * @description
   * - Suscribe al observable de notificaciones de BD
   * - Suscribe al observable de contador de no leídas
   * - Carga notificaciones iniciales
   * 
   * @returns {void}
   */
  ngOnInit(): void {
    // Suscribirse a las notificaciones de la BD
    const dbNotificationsSub = this.notificationService.dbNotifications$.subscribe(
      notifications => {
        this.notifications = notifications;
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
   * Limpia las suscripciones al destruir el componente.
   * 
   * @description
   * Previene memory leaks desuscribiendo todos los observables activos
   * y limpiando overlays activos.
   * 
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Limpiar modal overlay si existe
    if (this.modalOverlayRef) {
      this.modalOverlayRef.dispose();
      this.modalOverlayRef = null;
    }

    // Limpiar timeout si existe
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
      this.dropdownTimeout = null;
    }
  }

  /**
   * Cierra el dropdown al hacer clic fuera (solo para móvil).
   * 
   * @param {MouseEvent} event - Evento de click
   * @returns {void}
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Solo para móvil (<640px)
    if (window.innerWidth < 640 && this.isOpen) {
      const target = event.target as HTMLElement;
      
      // Verificar si el click fue en el botón de notificaciones
      const clickedButton = this.notificationButton?.nativeElement.contains(target);
      
      // Verificar si el click fue dentro del dropdown móvil
      const clickedDropdown = target.closest('.notifications-dropdown-mobile') !== null;
      
      // Si no se hizo click ni en el botón ni en el dropdown, cerrar
      if (!clickedButton && !clickedDropdown) {
        this.closeDropdown();
      }
    }
  }

  /**
   * Alterna la visibilidad del dropdown.
   * 
   * @description
   * - Desktop (≥640px): Toggle simple
   * - Móvil (<640px): Toggle y recarga notificaciones
   * 
   * @returns {void}
   * @public
   */
  toggleDropdown(): void {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Abre el dropdown.
   * 
   * @description
   * - Cierra el modal si está abierto
   * - En móvil (<640px): Emite evento para cerrar otros menús
   * - Marca como abierto
   * - Recarga notificaciones
   * 
   * @returns {void}
   * @private
   */
  private openDropdown(): void {
    // Cerrar modal si está abierto
    this.closeNotificationModal();
    
    // En móvil, emitir evento para cerrar otros menús
    if (window.innerWidth < 640) {
      this.closeOtherMenus.emit();
    }
    
    // Marcar como abierto
    this.isOpen = true;

    // Cargar notificaciones
    this.loadNotifications();
  }

  /**
   * Cierra el dropdown de notificaciones.
   * 
   * @returns {void}
   * @public
   */
  closeDropdown(): void {
    this.isOpen = false;
    
    // Limpiar timeout si existe
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
      this.dropdownTimeout = null;
    }
  }

  /**
   * Cierra el dropdown desde el exterior (llamado por el navbar).
   * Método público para que el navbar pueda cerrar las notificaciones.
   * 
   * @returns {void}
   * @public
   */
  close(): void {
    this.closeDropdown();
  }

  /**
   * Muestra el dropdown al hacer hover (solo desktop ≥640px).
   * 
   * @description
   * Cancela cualquier timeout pendiente de cierre y muestra el dropdown.
   * Solo funciona en desktop (≥640px).
   * 
   * @returns {void}
   * @public
   */
  showDropdownOnHover(): void {
    // Solo para desktop (≥640px)
    if (window.innerWidth >= 640) {
      // Cancelar timeout de cierre si existe
      if (this.dropdownTimeout) {
        clearTimeout(this.dropdownTimeout);
        this.dropdownTimeout = null;
      }
      
      // Mostrar dropdown
      this.isOpen = true;
      
      // Cargar notificaciones si no están cargadas
      if (this.notifications.length === 0 && !this.isLoading) {
        this.loadNotifications();
      }
    }
  }

  /**
   * Oculta el dropdown al salir del hover (solo desktop ≥640px).
   * 
   * @description
   * Crea un timeout de 200ms antes de cerrar para permitir que el usuario
   * mueva el mouse desde el botón al dropdown sin que se cierre.
   * Solo funciona en desktop (≥640px).
   * 
   * @returns {void}
   * @public
   */
  hideDropdownOnLeave(): void {
    // Solo para desktop (≥640px)
    if (window.innerWidth >= 640) {
      // Limpiar timeout anterior si existe
      if (this.dropdownTimeout) {
        clearTimeout(this.dropdownTimeout);
      }
      
      // Crear nuevo timeout de 200ms
      this.dropdownTimeout = setTimeout(() => {
        // Verificar nuevamente el ancho de pantalla antes de cerrar
        if (window.innerWidth >= 640) {
          this.isOpen = false;
        }
        this.dropdownTimeout = null;
      }, 200);
    }
  }

  /**
   * Abre el modal con los detalles de una notificación usando CDK Overlay.
   * 
   * @description
   * - Cierra el dropdown primero para evitar superposición
   * - Crea un overlay centrado globalmente usando CDK
   * - Renderiza el modal usando ComponentPortal
   * - Configura backdrop para cerrar al hacer clic fuera
   * - Marca automáticamente como leída si no lo está
   * 
   * @param {DbNotification} notification - Notificación a mostrar en modal
   * @returns {void}
   * @public
   */
  openNotificationModal(notification: DbNotification): void {
    // Cerrar dropdown para que desaparezca
    this.closeDropdown();
    
    // Si ya hay un modal abierto, cerrarlo primero
    if (this.modalOverlayRef) {
      this.modalOverlayRef.dispose();
    }
    
    // Crear overlay centrado globalmente
    const positionStrategy = this.overlay.position()
      .global()
      .centerHorizontally()
      .centerVertically();
    
    this.modalOverlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      panelClass: 'notification-modal-overlay',
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.block()
    });
    
    // Crear portal del componente modal
    const modalPortal = new ComponentPortal(NotificationModalComponent);
    const modalRef = this.modalOverlayRef.attach(modalPortal);
    
    // Pasar datos al componente modal
    modalRef.instance.notification = notification;
    
    // Suscribirse al evento de cerrar
    const closeSubscription = modalRef.instance.closeModalEvent.subscribe(() => {
      this.closeNotificationModal();
    });
    
    // Suscribirse al evento de marcar como leída
    const markAsReadSubscription = modalRef.instance.markAsReadEvent.subscribe((notif: DbNotification) => {
      this.markAsRead(notif);
    });
    
    // Cerrar al hacer clic en el backdrop
    const backdropSubscription = this.modalOverlayRef.backdropClick().subscribe(() => {
      this.closeNotificationModal();
    });
    
    // Guardar suscripciones para limpiar después
    this.subscriptions.push(closeSubscription, markAsReadSubscription, backdropSubscription);
    
    // Marcar como leída si no lo está
    if (!notification.leida) {
      this.markAsRead(notification);
    }
  }

  /**
   * Cierra el modal de detalles de notificación y limpia el overlay.
   * 
   * @returns {void}
   * @public
   */
  closeNotificationModal(): void {
    this.selectedNotification = null;
    
    if (this.modalOverlayRef) {
      this.modalOverlayRef.dispose();
      this.modalOverlayRef = null;
    }
  }

  /**
   * Navega a la página completa de notificaciones.
   * 
   * @description
   * Cierra el dropdown y redirige a /notifications
   * 
   * @returns {void}
   * @public
   */
  viewAllNotifications(): void {
    this.closeDropdown();
    this.router.navigate(['/notifications']);
  }

  /**
   * Carga las notificaciones y el contador desde el servidor.
   * 
   * @description
   * Ejecuta dos llamadas en paralelo usando Promise.all:
   * - Carga notificaciones de BD
   * - Carga contador de no leídas
   * 
   * @returns {void}
   * @private
   */
  loadNotifications(): void {
    this.isLoading = true;
    
    Promise.all([
      this.notificationService.loadDbNotifications().toPromise(),
      this.notificationService.loadUnreadCount().toPromise()
    ]).then(() => {
      this.isLoading = false;
    }).catch((error) => {
      this.logger.error('Error cargando notificaciones', error);
      this.isLoading = false;
    });
  }

  /**
   * Marca una notificación individual como leída.
   * 
   * @description
   * - Verifica que no esté ya leída
   * - Actualiza en el servidor
   * - Actualiza localmente (optimistic update)
   * - Recarga el contador de no leídas
   * 
   * @param {DbNotification} notification - Notificación a marcar como leída
   * @returns {void}
   * @public
   */
  markAsRead(notification: DbNotification): void {
    if (!notification.leida) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          // Actualizar la notificación localmente (optimistic update)
          notification.leida = true;
          notification.fechaLeida = new Date().toISOString();
          
          // Recargar unreadCount del servidor
          this.notificationService.loadUnreadCount().subscribe();
        },
        error: (error) => {
          this.logger.error('Error marcando como leída', error);
        }
      });
    }
  }

  /**
   * Marca todas las notificaciones como leídas.
   * 
   * @description
   * - Muestra estado de carga (isMarkingAllRead)
   * - Llama al servicio para marcar todas en servidor
   * - Actualiza todas localmente (optimistic update)
   * - Resetea el contador a 0
   * - Recarga el contador del servidor para sincronización
   * 
   * @returns {void}
   * @public
   */
  markAllAsRead(): void {
    this.isMarkingAllRead = true;
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        // Marcar todas como leídas localmente (optimistic update)
        this.notifications.forEach(n => {
          n.leida = true;
          n.fechaLeida = new Date().toISOString();
        });
        
        // Actualizar conteo local directamente
        this.unreadCount = 0;
        this.isMarkingAllRead = false;
        
        // Recargar conteo del servidor para asegurar sincronización
        this.notificationService.loadUnreadCount().subscribe();
      },
      error: (error) => {
        this.logger.error('Error marcando todas como leídas', error);
        this.isMarkingAllRead = false;
      }
    });
  }

  /**
   * Convierte una fecha en formato relativo legible (ej: "Hace 5 min").
   * 
   * @description
   * Calcula la diferencia entre la fecha actual y la fecha proporcionada,
   * retornando un string en español con formato relativo:
   * - Menos de 1 minuto: "Hace un momento"
   * - Menos de 1 hora: "Hace X min"
   * - Menos de 1 día: "Hace X h"
   * - Menos de 1 mes: "Hace X días"
   * - Más de 1 mes: Fecha formateada (DD/MM/AAAA)
   * 
   * @param {string} dateString - Fecha en formato ISO string
   * @returns {string} Texto relativo de tiempo transcurrido
   * @public
   * 
   * @example
   * ```typescript
   * getTimeAgo('2024-10-27T10:30:00Z') // "Hace 5 min"
   * getTimeAgo('2024-10-26T10:30:00Z') // "Hace 1 día"
   * ```
   */
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

}