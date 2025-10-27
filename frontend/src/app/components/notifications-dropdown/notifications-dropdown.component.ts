import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, DbNotification } from '../../services/notification.service';
import { NotificationModalComponent } from '../notification-modal/notification-modal.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications-dropdown',
  standalone: true,
  imports: [CommonModule, NotificationModalComponent],
  templateUrl: './notifications-dropdown.component.html',
  styleUrls: ['./notifications-dropdown.component.scss']
})
export class NotificationsDropdownComponent implements OnInit, OnDestroy {
  
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  
  notifications: DbNotification[] = [];
  unreadCount = 0;
  isOpen = false;
  isLoading = false;
  isMarkingAllRead = false;
  selectedNotification: DbNotification | null = null;

  private subscriptions: Subscription[] = [];

  ngOnInit() {
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

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  closeDropdown() {
    this.isOpen = false;
  }

  openNotificationModal(notification: DbNotification) {
    this.selectedNotification = notification;
    // ✅ CORREGIDO: No cerrar el dropdown inmediatamente, solo marcar como leída si es necesario
    
    // Mark as read if not already read
    if (!notification.leida) {
      this.markAsRead(notification);
    }
  }

  closeNotificationModal() {
    this.selectedNotification = null;
  }

  viewAllNotifications() {
    this.isOpen = false;
    this.router.navigate(['/notifications']);
  }

  loadNotifications() {
    this.isLoading = true;
    // ✅ CORREGIDO: Usar Promise.all para ejecutar ambas llamadas en paralelo
    // y evitar doble loading de unreadCount (que se hace después en markAsRead)
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

  markAsRead(notification: DbNotification) {
    if (!notification.leida) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          // Actualizar la notificación localmente
          notification.leida = true;
          notification.fechaLeida = new Date().toISOString();
          
          // ✅ CORREGIDO: Recargar unreadCount solo si fue marcada como leída
          this.notificationService.loadUnreadCount().subscribe();
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
        
        // ✅ CORREGIDO: Actualizar conteo local directamente
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