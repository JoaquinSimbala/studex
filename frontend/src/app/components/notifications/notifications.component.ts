import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Contenedor de notificaciones toast -->
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <div 
        *ngFor="let notification of notifications" 
        class="bg-white border border-gray-200 rounded-lg shadow-lg p-4 transition-all duration-300 transform"
        [class]="getNotificationClasses(notification.type)">
        
        <div class="flex items-start">
          <!-- Icono -->
          <div class="flex-shrink-0 mr-3">
            <svg 
              class="w-5 h-5" 
              [class]="getIconClasses(notification.type)"
              fill="currentColor" 
              viewBox="0 0 20 20">
              
              <!-- Icono de éxito -->
              <path *ngIf="notification.type === 'success'" 
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              
              <!-- Icono de error -->
              <path *ngIf="notification.type === 'error'" 
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"/>
              
              <!-- Icono de advertencia -->
              <path *ngIf="notification.type === 'warning'" 
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
              
              <!-- Icono de información -->
              <path *ngIf="notification.type === 'info'" 
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
            </svg>
          </div>

          <!-- Contenido -->
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-sm" [class]="getTitleClasses(notification.type)">
              {{ notification.title }}
            </h4>
            <p class="text-sm text-gray-600 mt-1">
              {{ notification.message }}
            </p>
          </div>

          <!-- Botón cerrar -->
          <button 
            (click)="removeNotification(notification.id)"
            class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Animaciones adicionales si son necesarias */
    .notification-enter {
      transform: translateX(100%);
      opacity: 0;
    }
    
    .notification-enter-active {
      transform: translateX(0);
      opacity: 1;
      transition: all 0.3s ease-in;
    }
    
    .notification-leave-active {
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease-out;
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // Suscribirse solo a las notificaciones toast temporales
    this.subscription = this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /**
   * Remueve una notificación específica
   */
  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }

  /**
   * Obtiene las clases CSS para el contenedor de la notificación
   */
  getNotificationClasses(type: Notification['type']): string {
    const baseClasses = 'border-l-4';
    
    switch (type) {
      case 'success':
        return `${baseClasses} border-studex-600 bg-studex-50`;
      case 'error':
        return `${baseClasses} border-red-500 bg-red-50`;
      case 'warning':
        return `${baseClasses} border-orange-500 bg-orange-50`;
      case 'info':
        return `${baseClasses} border-blue-500 bg-blue-50`;
      default:
        return `${baseClasses} border-gray-500 bg-gray-50`;
    }
  }

  /**
   * Obtiene las clases CSS para el icono
   */
  getIconClasses(type: Notification['type']): string {
    switch (type) {
      case 'success':
        return 'text-studex-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Obtiene las clases CSS para el título
   */
  getTitleClasses(type: Notification['type']): string {
    switch (type) {
      case 'success':
        return 'text-studex-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-orange-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  }
}