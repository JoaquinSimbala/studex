import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

export interface Purchase {
  id: string;
  userId: string;
  projectId: number;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  transactionId: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface PurchaseRequest {
  projectId: number;
  paymentMethod: 'YAPE' | 'PLIN' | 'BANCARIO';
  amount: number;
  currency: string;
}

export interface PurchaseResponse {
  success: boolean;
  data?: Purchase;
  message?: string;
  error?: string;
}

export interface UserPurchases {
  purchases: Purchase[];
  projectIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private apiUrl = environment.apiUrl;
  
  // Cache de compras del usuario
  private userPurchasesSubject = new BehaviorSubject<UserPurchases>({ purchases: [], projectIds: [] });
  public userPurchases$ = this.userPurchasesSubject.asObservable();
  
  // Estado de compras en progreso
  private pendingPurchasesSubject = new BehaviorSubject<Set<number>>(new Set());
  public pendingPurchases$ = this.pendingPurchasesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private apiService: ApiService
  ) {
    // Cargar compras cuando el usuario se autentica
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadUserPurchases();
      } else {
        this.clearPurchases();
      }
    });
  }

  /**
   * Procesar compra desde carrito (múltiples proyectos)
   */
  async purchaseFromCart(projects: Array<{projectId: number, amount: number}>, paymentMethod: 'YAPE' | 'PLIN' | 'BANCARIO'): Promise<PurchaseResponse> {
    try {
      console.log('🛒 Procesando compra desde carrito:', { projects, paymentMethod });

      // Agregar todos los proyectos a compras en progreso
      projects.forEach(project => this.addPendingPurchase(project.projectId));

      // Simular delay de procesamiento para UX
      await this.delay(2000);

      // Hacer llamada al backend para compra de carrito
      const response = await this.apiService.purchaseCart({
        projects,
        paymentMethod
      }).toPromise();

      // Remover todos los proyectos de compras en progreso
      projects.forEach(project => this.removePendingPurchase(project.projectId));
      
      if (response?.success) {
        // Recargar compras del usuario para actualizar cache
        await this.loadUserPurchases();
        
        return {
          success: true,
          data: response.data,
          message: response.message || 'Compra de carrito procesada exitosamente'
        };
      } else {
        return {
          success: false,
          error: response?.errors?.[0] || 'Error procesando la compra del carrito'
        };
      }
    } catch (error: any) {
      // Remover todos los proyectos de compras en progreso en caso de error
      projects.forEach(project => this.removePendingPurchase(project.projectId));
      
      console.error('❌ Error procesando compra de carrito:', error);
      return {
        success: false,
        error: error?.message || 'Error procesando la compra del carrito'
      };
    }
  }

  /**
   * Procesar una compra de proyecto
   */
  async purchaseProject(request: PurchaseRequest): Promise<PurchaseResponse> {
    try {
      // Agregar a compras en progreso
      this.addPendingPurchase(request.projectId);

      // Simular delay de procesamiento para UX
      await this.delay(1500);

      // Hacer llamada real al backend
      const response = await this.apiService.purchaseProject(request).toPromise();
      this.removePendingPurchase(request.projectId);
      
      if (response?.success) {
        // Recargar compras del usuario para actualizar cache
        await this.loadUserPurchases();
        
        return {
          success: true,
          data: response.data,
          message: response.message || 'Compra procesada exitosamente'
        };
      } else {
        return {
          success: false,
          error: Array.isArray(response?.errors) ? response.errors.join(', ') : (response?.errors || 'Error procesando la compra')
        };
      }
    } catch (error: any) {
      this.removePendingPurchase(request.projectId);
      console.error('❌ Error procesando compra:', error);
      return {
        success: false,
        error: error?.message || 'Error procesando la compra'
      };
    }
  }

  /**
   * Verificar si el usuario ha comprado un proyecto específico
   */
  hasUserPurchased(projectId: number): boolean {
    const currentPurchases = this.userPurchasesSubject.value;
    const hasPurchased = currentPurchases.projectIds.includes(projectId);
    console.log('🔍 Verificando compra:', {
      projectId,
      projectIds: currentPurchases.projectIds,
      hasPurchased
    });
    return hasPurchased;
  }

  /**
   * Verificar si una compra está en progreso
   */
  isPurchasePending(projectId: number): boolean {
    return this.pendingPurchasesSubject.value.has(projectId);
  }

  /**
   * Obtener todas las compras del usuario
   */
  getUserPurchases(): Observable<UserPurchases> {
    return this.userPurchases$;
  }

  /**
   * Cargar compras del usuario desde el backend (método público para forzar actualización)
   */
  async refreshUserPurchases(): Promise<void> {
    return this.loadUserPurchases();
  }

  /**
   * Cargar compras del usuario desde el backend
   */
  private async loadUserPurchases(): Promise<void> {
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        console.log('❌ No hay usuario logueado');
        return;
      }

      console.log('📥 Cargando compras para usuario:', user.id);
      // Siempre cargar desde backend
      const response = await this.apiService.getUserPurchases(user.id).toPromise();
      
      console.log('📊 Respuesta del backend:', response);
      
      if (response?.success && response.data) {
        const purchases = response.data;
        const projectIds = purchases
          .filter((p: Purchase) => p.status === 'COMPLETED')
          .map((p: Purchase) => p.projectId);
        
        console.log('✅ Compras cargadas:', {
          totalPurchases: purchases.length,
          completedProjectIds: projectIds
        });
        
        this.userPurchasesSubject.next({ purchases, projectIds });
      } else {
        console.log('⚠️ Sin datos de compras o respuesta inválida');
        // Si no hay datos o hay error, mantener cache vacío
        this.userPurchasesSubject.next({ purchases: [], projectIds: [] });
      }
    } catch (error) {
      console.error('❌ Error cargando compras del usuario:', error);
      // En caso de error, también mantener cache vacío
      this.userPurchasesSubject.next({ purchases: [], projectIds: [] });
    }
  }

  /**
   * Limpiar datos de compras
   */
  private clearPurchases(): void {
    this.userPurchasesSubject.next({ purchases: [], projectIds: [] });
    this.pendingPurchasesSubject.next(new Set());
  }

  /**
   * Agregar compra a estado pendiente
   */
  private addPendingPurchase(projectId: number): void {
    const current = this.pendingPurchasesSubject.value;
    current.add(projectId);
    this.pendingPurchasesSubject.next(new Set(current));
  }

  /**
   * Remover compra de estado pendiente
   */
  private removePendingPurchase(projectId: number): void {
    const current = this.pendingPurchasesSubject.value;
    current.delete(projectId);
    this.pendingPurchasesSubject.next(new Set(current));
  }

  /**
   * Agregar compra al cache local (para desarrollo)
   */
  private addPurchaseToCache(purchase: Purchase): void {
    const cached = this.getCachedPurchases();
    cached.push(purchase);
    localStorage.setItem('studex_purchases', JSON.stringify(cached));
    
    // Actualizar estado
    const projectIds = cached
      .filter(p => p.status === 'COMPLETED')
      .map(p => p.projectId);
    
    this.userPurchasesSubject.next({ purchases: cached, projectIds });
  }

  /**
   * Obtener compras del cache local (para desarrollo)
   */
  private getCachedPurchases(): Purchase[] {
    try {
      const cached = localStorage.getItem('studex_purchases');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }

  /**
   * Generar ID único para simulación
   */
  private generateId(): string {
    return 'purchase_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generar ID de transacción para simulación
   */
  private generateTransactionId(): string {
    return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  /**
   * Simular delay para operaciones asíncronas
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtener historial de compras para mostrar en perfil
   */
  async getPurchaseHistory(): Promise<Purchase[]> {
    const userPurchases = this.userPurchasesSubject.value;
    return userPurchases.purchases;
  }

  /**
   * Obtener estadísticas de compras
   */
  getPurchaseStats(): Observable<{totalPurchases: number, totalSpent: number}> {
    return new Observable(observer => {
      this.userPurchases$.subscribe(userPurchases => {
        const completedPurchases = userPurchases.purchases.filter(p => p.status === 'COMPLETED');
        const stats = {
          totalPurchases: completedPurchases.length,
          totalSpent: completedPurchases.reduce((sum, p) => sum + p.amount, 0)
        };
        observer.next(stats);
      });
    });
  }

  /**
   * Simular reembolso (solo para desarrollo)
   */
  async refundPurchase(purchaseId: string): Promise<{success: boolean, message?: string}> {
    try {
      const cached = this.getCachedPurchases();
      const purchaseIndex = cached.findIndex(p => p.id === purchaseId);
      
      if (purchaseIndex === -1) {
        return { success: false, message: 'Compra no encontrada' };
      }

      cached[purchaseIndex].status = 'REFUNDED';
      localStorage.setItem('studex_purchases', JSON.stringify(cached));
      
      // Recargar compras
      await this.loadUserPurchases();
      
      return { success: true, message: 'Reembolso procesado exitosamente' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Error procesando reembolso' };
    }
  }
}