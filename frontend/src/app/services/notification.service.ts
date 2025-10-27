import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface DbNotification {
  id: number;
  usuarioId: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaLeida?: string;
  datosExtra?: any;
  fechaCreacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  /**
   * Muestra una notificación de éxito
   */
  showSuccess(title: string, message: string, duration: number = 5000): void {
    this.addNotification('success', title, message, duration);
  }

  /**
   * Muestra una notificación de error
   */
  showError(title: string, message: string, duration: number = 7000): void {
    this.addNotification('error', title, message, duration);
  }

  /**
   * Muestra una notificación de advertencia
   */
  showWarning(title: string, message: string, duration: number = 6000): void {
    this.addNotification('warning', title, message, duration);
  }
  
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  // Subscripción de polling - DEBE ser limpiada
  private pollingSubscription: Subscription | null = null;
  
  // Notificaciones temporales (toasts)
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // Notificaciones persistentes de la BD
  // Notificaciones persistentes de la BD
  private dbNotificationsSubject = new BehaviorSubject<DbNotification[]>([]);
  public dbNotifications$ = this.dbNotificationsSubject.asObservable();

  // Conteo de no leídas
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor() {
    // Iniciar polling si está autenticado
    this.startPolling();
  }

  /**
   * Inicia el polling de notificaciones
   */
  private startPolling(): void {
    // Cargar notificaciones al inicializar si ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.loadDbNotifications().subscribe();
      this.loadUnreadCount().subscribe();
    }

    // Limpiar cualquier suscripción previa de polling
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }

    // Verificar notificaciones cada 30 segundos si está autenticado
    // ✅ CORREGIDO: Guardamos la suscripción para poder limpiarla
    this.pollingSubscription = interval(30000).subscribe(() => {
      if (this.authService.isAuthenticated()) {
        this.loadDbNotifications().subscribe();
        this.loadUnreadCount().subscribe();
      }
    });
  }

  /**
   * Detiene el polling cuando el servicio se destruye
   */
  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      console.log('🧹 Polling de notificaciones detenido');
    }
  }

  /**
   * Muestra una notificación de éxito
  // MÉTODO NO USADO EN EL SISTEMA
  // clearAll(): void {
  //   this.notificationsSubject.next([]);
  // }
   * Muestra una notificación de error
  // MÉTODO NO USADO EN EL SISTEMA
  // getDbNotifications(): DbNotification[] {
  //   return this.dbNotificationsSubject.value;
  // }
   * Muestra una notificación de advertencia
  // MÉTODO NO USADO EN EL SISTEMA
  // getUnreadCount(): number {
  //   return this.unreadCountSubject.value;
  // }
   * Muestra una notificación informativa
   */
  showInfo(title: string, message: string, duration: number = 5000): void {
    this.addNotification('info', title, message, duration);
  }

  /**
   * Añade una notificación al stack
   */
  private addNotification(type: Notification['type'], title: string, message: string, duration: number): void {
    const notification: Notification = {
      id: this.generateId(),
      type,
      title,
      message,
      duration
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, notification]);

    // Auto-remover después del tiempo especificado
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }
  }

  /**
   * Remueve una notificación por ID
   */
  /**
   * Remueve una notificación por ID
   */
  removeNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(filteredNotifications);
  }

  /**
   * Limpia todas las notificaciones
   */
  // MÉTODO NO USADO EN LA FUNCIONALIDAD ACTUAL DE NOTIFICACIONES
  // clearAll(): void {
  //   this.notificationsSubject.next([]);
  // }

  /**
   * Genera un ID único para la notificación
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Cargar notificaciones de la base de datos
   */
  loadDbNotifications(): Observable<any> {
    console.log('🔄 Cargando notificaciones de la BD...');
    console.log('🔑 Token disponible:', !!this.authService.getToken());
    console.log('📡 URL:', `${environment.apiUrl}/notifications?limit=20`);
    
    return new Observable(observer => {
      const headers: any = {};
      const token = this.authService.getToken();
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔐 Headers con autenticación agregados');
      } else {
        console.warn('⚠️ No hay token de autenticación');
        observer.error('No authenticated');
        return;
      }

      this.http.get<any>(`${environment.apiUrl}/notifications?limit=20`, { headers })
        .subscribe({
          next: (response) => {
            console.log('✅ Respuesta recibida:', response);
            if (response.success) {
              console.log('📋 Notificaciones encontradas:', response.data?.length || 0);
              console.log('📝 Datos:', response.data);
              this.dbNotificationsSubject.next(response.data || []);
            } else {
              console.warn('⚠️ Respuesta no exitosa:', response);
              this.dbNotificationsSubject.next([]);
            }
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('❌ Error cargando notificaciones:', error);
            console.error('📊 Status:', error.status);
            console.error('📝 Message:', error.message);
            this.dbNotificationsSubject.next([]);
            observer.error(error);
          }
        });
    });
  }

  /**
   * Cargar conteo de notificaciones no leídas
   */
  loadUnreadCount(): Observable<any> {
    console.log('🔢 Cargando conteo de no leídas...');
    
    return new Observable(observer => {
      const headers: any = {};
      const token = this.authService.getToken();
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('⚠️ No hay token para conteo no leídas');
        observer.error('No authenticated');
        return;
      }

      this.http.get<any>(`${environment.apiUrl}/notifications/unread-count`, { headers })
        .subscribe({
          next: (response) => {
            console.log('✅ Conteo recibido:', response);
            if (response.success) {
              const count = response.data?.unreadCount || 0;
              console.log('🔢 No leídas:', count);
              this.unreadCountSubject.next(count);
            }
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('❌ Error cargando conteo no leídas:', error);
            observer.error(error);
          }
        });
    });
  }

  /**
   * Marcar notificación como leída
   */
  markAsRead(notificationId: number): Observable<any> {
    const headers: any = {};
    const token = this.authService.getToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.put(`${environment.apiUrl}/notifications/${notificationId}/read`, {}, { headers });
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  markAllAsRead(): Observable<any> {
    const headers: any = {};
    const token = this.authService.getToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.put(`${environment.apiUrl}/notifications/mark-all-read`, {}, { headers });
  }

  /**
   * Obtener las notificaciones de la BD (solo getter)
   */
  // MÉTODO NO USADO EN LA FUNCIONALIDAD ACTUAL DE NOTIFICACIONES
  // getDbNotifications(): DbNotification[] {
  //   return this.dbNotificationsSubject.value;
  // }

  /**
   * Obtener el conteo actual de no leídas
   */
  // MÉTODO NO USADO EN LA FUNCIONALIDAD ACTUAL DE NOTIFICACIONES
  // getUnreadCount(): number {
  //   return this.unreadCountSubject.value;
  // }
}