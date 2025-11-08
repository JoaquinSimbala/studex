import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

export interface CartItem {
  id: number;
  usuarioId: number;
  proyectoId: number;
  fechaAgregado: string;
  proyecto: {
    id: number;
    titulo: string;
    descripcion: string;
    precio: number;
    tipo: string;
    universidad: string;
    materia: string;
    año: number;
    vendedor: {
      id: number;
      nombre: string;
      apellidos?: string;
      calificacionVendedor: number;
      totalVentas: number;
      profileImage?: string;
    };
    categoria: {
      id: number;
      nombre: string;
      colorHex: string;
    };
    imagenes: Array<{
      urlArchivo: string;
      nombreArchivo: string;
    }>;
  };
}

export interface CartSummary {
  items: CartItem[];
  total: number;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private logger = inject(LoggerService);

  // Estado del carrito
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  private cartCountSubject = new BehaviorSubject<number>(0);
  public cartCount$ = this.cartCountSubject.asObservable();

  private totalSubject = new BehaviorSubject<number>(0);
  public total$ = this.totalSubject.asObservable();

  constructor() {
    // Cargar carrito al inicializar si está autenticado
    if (this.authService.isAuthenticated()) {
      this.loadCart().subscribe();
    }

    // Limpiar carrito cuando el usuario cierre sesión
    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.clearLocalCart();
      } else {
        this.loadCart().subscribe();
      }
    });
  }

  /**
   * Cargar carrito desde el servidor
   */
  loadCart(): Observable<CartSummary> {
    this.logger.log('Cargando carrito');
    
    return new Observable(observer => {
      const headers: any = {};
      const token = this.authService.getToken();
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        this.logger.warn('No hay token para cargar carrito');
        observer.error('No authenticated');
        return;
      }

      this.http.get<any>(`${environment.apiUrl}/cart`, { headers })
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              const cartData = response.data as CartSummary;
              this.logger.success('Carrito cargado', cartData.count);
              this.cartSubject.next(cartData.items);
              this.cartCountSubject.next(cartData.count);
              this.totalSubject.next(cartData.total);
              observer.next(cartData);
            } else {
              this.clearLocalCart();
              observer.next({ items: [], total: 0, count: 0 });
            }
            observer.complete();
          },
          error: (error) => {
            console.error('❌ Error cargando carrito:', error);
            this.clearLocalCart();
            observer.error(error);
          }
        });
    });
  }

  /**
   * Agregar proyecto al carrito
   */
  addToCart(projectId: number): Observable<any> {
    console.log('➕ Agregando al carrito proyecto:', projectId);
    
    const headers: any = {};
    const token = this.authService.getToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new Observable(observer => {
      this.http.post<any>(`${environment.apiUrl}/cart`, 
        { projectId }, 
        { headers }
      ).subscribe({
        next: (response) => {
          console.log('✅ Agregado al carrito:', response);
          // Recargar carrito después de agregar
          this.loadCart().subscribe(() => {
            observer.next(response);
            observer.complete();
          });
        },
        error: (error) => {
          console.error('❌ Error agregando al carrito:', error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Remover proyecto del carrito
   */
  removeFromCart(projectId: number): Observable<any> {
    console.log('➖ Removiendo del carrito proyecto:', projectId);
    
    const headers: any = {};
    const token = this.authService.getToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new Observable(observer => {
      this.http.delete<any>(`${environment.apiUrl}/cart/${projectId}`, { headers })
        .subscribe({
          next: (response) => {
            console.log('✅ Removido del carrito:', response);
            // Recargar carrito después de remover
            this.loadCart().subscribe(() => {
              observer.next(response);
              observer.complete();
            });
          },
          error: (error) => {
            console.error('❌ Error removiendo del carrito:', error);
            observer.error(error);
          }
        });
    });
  }

  /**
   * Limpiar todo el carrito
   */
  clearCart(): Observable<any> {
    console.log('🗑️ Limpiando carrito...');
    
    const headers: any = {};
    const token = this.authService.getToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new Observable(observer => {
      this.http.delete<any>(`${environment.apiUrl}/cart`, { headers })
        .subscribe({
          next: (response) => {
            console.log('✅ Carrito limpiado:', response);
            this.clearLocalCart();
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('❌ Error limpiando carrito:', error);
            observer.error(error);
          }
        });
    });
  }

  /**
   * Verificar si un proyecto está en el carrito
   */
  isInCart(projectId: number): boolean {
    const currentCart = this.cartSubject.value;
    return currentCart.some(item => item.proyecto.id === projectId);
  }

  /**
   * Obtener items del carrito (solo getter)
   */
  getCartItems(): CartItem[] {
    return this.cartSubject.value;
  }

  /**
   * Obtener conteo del carrito
   */
  getCartCount(): number {
    return this.cartCountSubject.value;
  }

  /**
   * Obtener total del carrito
   */
  getCartTotal(): number {
    return this.totalSubject.value;
  }

  /**
   * Limpiar estado local del carrito
   */
  private clearLocalCart(): void {
    this.cartSubject.next([]);
    this.cartCountSubject.next(0);
    this.totalSubject.next(0);
  }

  /**
   * Cargar solo el conteo del carrito (más liviano)
   */
  loadCartCount(): Observable<number> {
    const headers: any = {};
    const token = this.authService.getToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new Observable(observer => {
      this.http.get<any>(`${environment.apiUrl}/cart/count`, { headers })
        .subscribe({
          next: (response) => {
            if (response.success) {
              const count = response.data.count;
              this.cartCountSubject.next(count);
              observer.next(count);
            }
            observer.complete();
          },
          error: (error) => {
            console.error('Error cargando conteo del carrito:', error);
            observer.error(error);
          }
        });
    });
  }
}