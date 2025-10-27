import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface FavoriteProject {
  id: number;
  projectId: number;
  userId: number;
  createdAt: Date;
  project: {
    id: number;
    title: string;
    description: string;
    price: number;
    type: string;
    university: string;
    category: string;
    year: number;
    rating: number;
    views: number;
    mainImage?: {
      fileUrl: string;
      fileName: string;
    } | null;
    seller: {
      id: number;
      name: string;
      avatar?: string;
      rating: number;
      salesCount: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private favoritesSubject = new BehaviorSubject<FavoriteProject[]>([]);
  public favorites$ = this.favoritesSubject.asObservable();
  
  private favoriteProjectIds = new Set<number>();
  private readonly baseUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Cargar favoritos al inicializar si hay usuario autenticado
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadFavorites().subscribe();
      } else {
        this.clearFavorites();
      }
    });
  }

  /**
   * Carga los favoritos del usuario desde el backend
   */
  loadFavorites(): Observable<any> {
    const headers = this.getHeaders();
    if (!headers) {
      return new Observable(observer => observer.error('No authenticated'));
    }

    return this.http.get<any>(`${this.baseUrl}/favorites`, { headers }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.favoritesSubject.next(response.data);
          this.updateFavoriteIds(response.data);
        }
      }),
      catchError(error => {
        console.error('Error cargando favoritos:', error);
        throw error;
      })
    );
  }

  /**
   * Agrega un proyecto a favoritos
   */
  /**
   * Agrega un proyecto a favoritos
   */
  addToFavorites(projectId: number): Observable<any> {
    console.log('➕ Agregando proyecto a favoritos:', projectId);
    
    const headers = this.getHeaders();
    if (!headers) {
      console.error('❌ No hay headers de autenticación');
      return new Observable(observer => observer.error('No authenticated'));
    }

    return this.http.post<any>(`${this.baseUrl}/favorites`, { projectId }, { headers }).pipe(
      tap(response => {
        console.log('✅ Proyecto agregado exitosamente a favoritos');
        if (response.success) {
          // Solo actualizar el estado interno después de confirmación del servidor
          this.favoriteProjectIds.add(projectId);
        }
      }),
      catchError(error => {
        console.error('❌ Error agregando a favoritos:', error);
        throw error;
      })
    );
  }

  /**
   * Remueve un proyecto de favoritos
   */
  removeFromFavorites(projectId: number): Observable<any> {
    console.log('➖ Removiendo proyecto de favoritos:', projectId);
    
    const headers = this.getHeaders();
    if (!headers) {
      console.error('❌ No hay headers de autenticación');
      return new Observable(observer => observer.error('No authenticated'));
    }

    return this.http.delete<any>(`${this.baseUrl}/favorites/${projectId}`, { headers }).pipe(
      tap(response => {
        console.log('✅ Proyecto removido exitosamente de favoritos');
        if (response.success) {
          // Solo actualizar el estado interno después de confirmación del servidor
          this.favoriteProjectIds.delete(projectId);
        }
      }),
      catchError(error => {
        console.error('❌ Error removiendo de favoritos:', error);
        throw error;
      })
    );
  }

  /**
   * Toggle favorito (agregar/remover)
   */
  toggleFavorite(projectId: number): Observable<any> {
    console.log('🔄 Toggle favorito para proyecto:', projectId);
    console.log('🔍 ¿Está en favoritos actualmente?', this.isFavorite(projectId));
    
    if (!projectId) {
      console.error('❌ ID de proyecto no válido');
      return new Observable(observer => observer.error('ID de proyecto no válido'));
    }
    
    if (this.isFavorite(projectId)) {
      console.log('➖ Removiendo de favoritos...');
      return this.removeFromFavorites(projectId);
    } else {
      console.log('➕ Agregando a favoritos...');
      return this.addToFavorites(projectId);
    }
  }

  /**
   * Verifica si un proyecto está en favoritos
   */
  isFavorite(projectId: number): boolean {
    return this.favoriteProjectIds.has(projectId);
  }

  /**
   * Obtiene la lista actual de favoritos
   */
  getFavorites(): FavoriteProject[] {
    return this.favoritesSubject.value;
  }

  /**
   * Limpia los favoritos (cuando usuario cierra sesión)
   */
  private clearFavorites(): void {
    this.favoritesSubject.next([]);
    this.favoriteProjectIds.clear();
  }

  /**
   * Actualiza el Set de IDs de proyectos favoritos
   */
  private updateFavoriteIds(favorites: FavoriteProject[]): void {
    this.favoriteProjectIds.clear();
    favorites.forEach(fav => this.favoriteProjectIds.add(fav.projectId));
  }

  /**
   * Obtiene headers de autenticación
   */
  private getHeaders(): { Authorization: string } | null {
    const token = this.authService.getToken();
    if (!token) {
      return null;
    }
    return {
      Authorization: `Bearer ${token}`
    };
  }
}