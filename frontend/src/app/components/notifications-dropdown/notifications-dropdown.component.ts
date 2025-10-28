import { Component, OnInit, OnDestroy, inject, ViewContainerRef, ElementRef, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import { NotificationService, DbNotification } from '../../services/notification.service';
import { NotificationModalComponent } from '../notification-modal/notification-modal.component';
import { Subscription } from 'rxjs';

/**
 * Componente dropdown de notificaciones.
 * 
 * Muestra un icono de campana en el navbar con badge de notificaciones no leídas.
 * Al hacer clic, despliega un panel flotante con la lista de notificaciones recientes.
 * 
 * @description
 * - Usa Angular CDK Overlay para renderizar dropdown y modal fuera del contexto del navbar
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
 * @version 2.0.0
 */
@Component({
  selector: 'app-notifications-dropdown',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './notifications-dropdown.component.html',
  styleUrls: ['./notifications-dropdown.component.scss']
})
export class NotificationsDropdownComponent implements OnInit, OnDestroy {
  
  /** Servicio de notificaciones inyectado */
  private notificationService = inject(NotificationService);
  
  /** Router de Angular para navegación */
  private router = inject(Router);
  
  /** Overlay service de Angular CDK */
  private overlay = inject(Overlay);
  
  /** ViewContainerRef para crear portals */
  private viewContainerRef = inject(ViewContainerRef);
  
  /** Referencia al overlay del modal */
  private modalOverlayRef: OverlayRef | null = null;
  
  /** Referencia al overlay del dropdown */
  private dropdownOverlayRef: OverlayRef | null = null;
  
  /** Referencia al botón de notificaciones (para posicionar dropdown) */
  @ViewChild('notificationButton', { read: ElementRef }) notificationButton!: ElementRef;
  
  /** Referencia al template del dropdown (para crear portal) */
  @ViewChild('dropdownTemplate', { read: TemplateRef }) dropdownTemplate!: TemplateRef<any>;
  
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
    
    // Limpiar dropdown overlay si existe
    if (this.dropdownOverlayRef) {
      this.dropdownOverlayRef.dispose();
      this.dropdownOverlayRef = null;
    }
  }

  /**
   * Alterna la visibilidad del dropdown.
   * 
   * @description
   * - Si se abre: crea overlay con CDK y recarga las notificaciones del servidor
   * - Si se cierra: cierra el overlay
   * 
   * @returns {void}
   * @public
   */
  toggleDropdown(): void {
    if (this.dropdownOverlayRef) {
      // Si ya está abierto, cerrarlo
      this.closeDropdown();
    } else {
      // Si está cerrado, abrirlo
      this.openDropdown();
    }
  }

  /**
   * Abre el dropdown usando CDK Overlay.
   * 
   * @description
   * Crea un overlay posicionado relativo al botón de notificaciones
   * y renderiza el contenido del dropdown fuera del contexto del navbar.
   * 
   * @returns {void}
   * @private
   */
  private openDropdown(): void {
    // Cerrar modal si está abierto
    this.closeNotificationModal();
    
    // Crear estrategia de posicionamiento conectada al botón
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.notificationButton)
      .withPositions([
        {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'top',
          offsetY: 8
        },
        {
          originX: 'end',
          originY: 'top',
          overlayX: 'end',
          overlayY: 'bottom',
          offsetY: -8
        }
      ])
      .withPush(true);

    // Crear configuración del overlay
    const overlayConfig = {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass: 'dropdown-overlay'
    };

    // Crear el overlay
    this.dropdownOverlayRef = this.overlay.create(overlayConfig);

    // Crear el portal con el template del dropdown
    const dropdownPortal = new TemplatePortal(
      this.dropdownTemplate,
      this.viewContainerRef
    );

    // Adjuntar el portal al overlay
    this.dropdownOverlayRef.attach(dropdownPortal);

    // Marcar como abierto para el template
    this.isOpen = true;

    // Cargar notificaciones
    this.loadNotifications();

    // Suscribirse a clicks en el backdrop para cerrar
    const backdropSub = this.dropdownOverlayRef.backdropClick().subscribe(() => {
      this.closeDropdown();
    });

    this.subscriptions.push(backdropSub);
  }

  /**
   * Cierra el dropdown de notificaciones.
   * 
   * @returns {void}
   * @public
   */
  closeDropdown(): void {
    if (this.dropdownOverlayRef) {
      this.dropdownOverlayRef.dispose();
      this.dropdownOverlayRef = null;
      this.isOpen = false;
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
    // Cerrar dropdown para que su backdrop desaparezca
    this.isOpen = false;
    
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
    const modalPortal = new ComponentPortal(NotificationModalComponent, this.viewContainerRef);
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
    this.isOpen = false;
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
      console.error('Error cargando notificaciones:', error);
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
          console.error('Error marcando como leída:', error);
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
        console.error('Error marcando todas como leídas:', error);
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