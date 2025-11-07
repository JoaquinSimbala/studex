import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FavoritesService, FavoriteProject } from '../../services/favorites.service';
import { ProjectCardComponent } from '../../components/project-card/project-card';
import { BackButtonComponent } from '../../components/back-button/back-button.component';
import { Observable } from 'rxjs';

/**
 * Componente de página de favoritos
 * 
 * @description
 * Muestra la lista de proyectos favoritos del usuario, permitiendo:
 * - Visualización en grid responsive de proyectos marcados como favoritos
 * - Estado de carga con spinner
 * - Estado vacío con mensaje y botón para explorar proyectos
 * - Estado de error con botón para reintentar
 * - Actualización manual de la lista de favoritos
 * - Navegación de regreso con BackButtonComponent
 * 
 * @features
 * - Observable reactivo para favoritos (favorites$)
 * - Transformación de datos para ProjectCardComponent
 * - Manejo de estados: loading, empty, error, success
 * - Grid responsive: 1 columna (móvil), 2 columnas (tablet), 3 columnas (desktop)
 * - Animaciones de entrada con delays escalonados
 * 
 * @dependencies
 * - FavoritesService: Gestión de favoritos del usuario
 * - ProjectCardComponent: Renderizado de tarjetas de proyectos
 * - BackButtonComponent: Navegación de regreso
 * 
 * @author Studex Team
 * @version 2.0.0
 */
@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, ProjectCardComponent, BackButtonComponent],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit {
  
  // ==================== SERVICIOS ====================
  
  /** Servicio de gestión de favoritos inyectado */
  private favoritesService = inject(FavoritesService);
  
  // ==================== PROPIEDADES PÚBLICAS ====================
  
  /** Observable de la lista de proyectos favoritos */
  favorites$: Observable<FavoriteProject[]>;
  
  /** Indica si se está cargando la lista de favoritos */
  isLoading = false;

  /**
   * Constructor del componente
   * 
   * @description
   * Inicializa el observable de favoritos desde el servicio
   */
  constructor() {
    this.favorites$ = this.favoritesService.favorites$;
  }

  // ==================== LIFECYCLE HOOKS ====================

  /**
   * Hook de inicialización del componente
   * 
   * @description
   * Carga la lista de favoritos al iniciar el componente
   */
  ngOnInit() {
    this.loadFavorites();
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Carga la lista de proyectos favoritos del usuario
   * 
   * @description
   * Obtiene los favoritos desde el servicio y actualiza el estado de carga.
   * Maneja errores y actualiza el flag isLoading apropiadamente.
   * 
   * @returns void
   * 
   * @example
   * ```typescript
   * this.loadFavorites(); // Recarga los favoritos
   * ```
   */
  loadFavorites(): void {
    this.isLoading = true;
    this.favoritesService.loadFavorites().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando favoritos:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Transforma un FavoriteProject al formato requerido por ProjectCardComponent
   * 
   * @param favorite - Proyecto favorito desde el servicio
   * @returns Objeto con el formato esperado por ProjectCardComponent
   * 
   * @description
   * Convierte la estructura de datos de FavoriteProject a la interfaz
   * que espera ProjectCardComponent. Consulta el estado actual de favoritos
   * desde el servicio para asegurar sincronización.
   * 
   * @example
   * ```typescript
   * const cardData = this.transformToProjectCard(favoriteProject);
   * // cardData contiene: id, title, description, price, etc.
   * ```
   */
  transformToProjectCard(favorite: FavoriteProject): any {
    // Consultar el estado real de favoritos en lugar de forzar true
    const isFavorite = this.favoritesService.isFavorite(favorite.projectId);
    
    return {
      id: favorite.projectId,
      title: favorite.project.title,
      description: favorite.project.description,
      price: favorite.project.price,
      type: favorite.project.type,
      university: favorite.project.university,
      category: favorite.project.category,
      year: favorite.project.year,
      rating: favorite.project.rating,
      views: favorite.project.views,
      mainImage: favorite.project.mainImage,
      isFavorite: isFavorite, // Estado real de favoritos
      seller: favorite.project.seller
    };
  }

}