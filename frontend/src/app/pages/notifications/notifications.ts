import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, DbNotification } from '../../services/notification.service';
import { NotificationModalComponent } from '../../components/notification-modal/notification-modal.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, NotificationModalComponent],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  
  private notificationService = inject(NotificationService);
  
  notifications: DbNotification[] = [];
  filteredNotifications: DbNotification[] = [];
  unreadCount = 0;
  isLoading = false;
  isLoadingMore = false;
  isMarkingAllRead = false;
  selectedNotification: DbNotification | null = null;
  
  currentFilter: 'all' | 'unread' | 'compra_exitosa' | 'nueva_venta' | 'proyecto_subido' | 'compra_error' = 'all';
  currentPage = 1;
  pageSize = 20;
  canLoadMore = true;

  private subscriptions: Subscription[] = [];

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

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadNotifications() {
    this.isLoading = true;
    this.currentPage = 1;
    
    this.notificationService.loadDbNotifications().subscribe({
      next: () => {
        this.isLoading = false;
        this.canLoadMore = this.notifications.length >= this.pageSize;
      },
      error: (error) => {
        console.error('Error cargando notificaciones:', error);
        this.isLoading = false;
      }
    });

    // También cargar el conteo
    this.notificationService.loadUnreadCount().subscribe();
  }

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
        console.error('Error cargando más notificaciones:', error);
        this.isLoadingMore = false;
        this.currentPage--; // Revertir el incremento
      }
    });
  }

  setFilter(filter: typeof this.currentFilter) {
    this.currentFilter = filter;
    this.applyFilter();
  }

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
  }

  openNotificationModal(notification: DbNotification) {
    this.selectedNotification = notification;
    
    // Mark as read if not already read
    if (!notification.leida) {
      this.markAsRead(notification);
    }
  }

  closeNotificationModal() {
    this.selectedNotification = null;
  }

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
          console.error('Error marcando como leída:', error);
        }
      });
    }
  }

  markAsReadAndClose(notification: DbNotification) {
    this.markAsRead(notification);
    this.closeNotificationModal();
  }

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
        console.error('Error marcando todas como leídas:', error);
        this.isMarkingAllRead = false;
      }
    });
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

  hasExtraData(datosExtra: any): boolean {
    if (!datosExtra) return false;
    return !!(datosExtra.proyecto || datosExtra.monto || datosExtra.metodoPago || datosExtra.comprador || datosExtra.vendedor);
  }

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