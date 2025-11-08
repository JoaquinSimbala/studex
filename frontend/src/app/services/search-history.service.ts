/**
 * @fileoverview Servicio para gestionar el historial de búsquedas
 * 
 * @description
 * Maneja todas las operaciones relacionadas con el historial de búsquedas del usuario:
 * - Guardar búsquedas realizadas
 * - Obtener búsquedas recientes del usuario
 * - Obtener búsquedas populares globales
 * - Eliminar (desactivar) búsquedas específicas
 * - Limpiar todo el historial
 * 
 * @author STUDEX Team
 * @version 1.0.0
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Interfaz para una búsqueda en el historial
 */
export interface SearchHistoryItem {
  id: number;
  termino: string;
  timestamp: Date;
}

/**
 * Interfaz para búsquedas populares
 */
export interface PopularSearch {
  termino: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchHistoryService {
  
  private apiUrl = `${environment.apiUrl}/search-history`;
  
  /**
   * Subject para emitir cambios en el historial de búsquedas
   * Permite que los componentes se suscriban a cambios en tiempo real
   */
  private searchHistorySubject = new BehaviorSubject<SearchHistoryItem[]>([]);
  public searchHistory$ = this.searchHistorySubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los headers HTTP con el token de autorización
   * 
   * @private
   * @returns HttpHeaders con el token Bearer
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('studex_token') || sessionStorage.getItem('studex_token');
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Guarda una nueva búsqueda en el historial
   * 
   * @param termino - Término de búsqueda a guardar
   * @returns Observable de la respuesta del servidor
   */
  saveSearch(termino: string): Observable<any> {
    return this.http.post(this.apiUrl, { termino }, { headers: this.getHeaders() }).pipe(
      tap(() => {
        // Actualizar el historial después de guardar
        this.loadRecentSearches().subscribe();
      }),
      catchError(error => {
        console.error('Error al guardar búsqueda:', error);
        return of(null);
      })
    );
  }

  /**
   * Obtiene las búsquedas recientes del usuario autenticado
   * 
   * @param limit - Número máximo de búsquedas a obtener (default: 5)
   * @returns Observable con el array de búsquedas recientes
   */
  loadRecentSearches(limit: number = 5): Observable<SearchHistoryItem[]> {
    return this.http.get<SearchHistoryItem[]>(`${this.apiUrl}/recent?limit=${limit}`, { headers: this.getHeaders() }).pipe(
      tap(searches => {
        this.searchHistorySubject.next(searches);
      }),
      catchError(error => {
        console.error('Error al cargar búsquedas recientes:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene las búsquedas populares globales
   * 
   * @param limit - Número máximo de búsquedas populares (default: 5)
   * @returns Observable con el array de búsquedas populares
   */
  getPopularSearches(limit: number = 5): Observable<PopularSearch[]> {
    return this.http.get<PopularSearch[]>(`${this.apiUrl}/popular?limit=${limit}`).pipe(
      catchError(error => {
        console.error('Error al cargar búsquedas populares:', error);
        // Retornar búsquedas por defecto en caso de error
        return of([
          { termino: 'Tesis de sistemas', count: 0 },
          { termino: 'Proyectos de ingeniería', count: 0 },
          { termino: 'Investigación de mercado', count: 0 }
        ]);
      })
    );
  }

  /**
   * Desactiva (elimina) una búsqueda específica del historial
   * 
   * @param searchId - ID de la búsqueda a eliminar
   * @returns Observable de la respuesta del servidor
   */
  removeSearch(searchId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${searchId}/deactivate`, {}, { headers: this.getHeaders() }).pipe(
      tap(() => {
        // Actualizar el historial después de eliminar
        const currentSearches = this.searchHistorySubject.value;
        const updatedSearches = currentSearches.filter(s => s.id !== searchId);
        this.searchHistorySubject.next(updatedSearches);
      }),
      catchError(error => {
        console.error('Error al eliminar búsqueda:', error);
        return of(null);
      })
    );
  }

  /**
   * Limpia todo el historial de búsquedas del usuario
   * 
   * @returns Observable de la respuesta del servidor
   */
  clearHistory(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/clear`, { headers: this.getHeaders() }).pipe(
      tap(() => {
        // Limpiar el subject después de borrar
        this.searchHistorySubject.next([]);
      }),
      catchError(error => {
        console.error('Error al limpiar historial:', error);
        return of(null);
      })
    );
  }

  /**
   * Obtiene el valor actual del historial de búsquedas sin Observable
   * 
   * @returns Array de búsquedas recientes actuales
   */
  getCurrentSearchHistory(): SearchHistoryItem[] {
    return this.searchHistorySubject.value;
  }
}
