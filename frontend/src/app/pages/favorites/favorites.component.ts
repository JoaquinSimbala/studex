import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FavoritesService, FavoriteProject } from '../../services/favorites.service';
import { ProjectCardComponent } from '../../components/project-card/project-card';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, ProjectCardComponent],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit {
  private favoritesService = inject(FavoritesService);
  
  favorites$: Observable<FavoriteProject[]>;
  isLoading = false;

  constructor() {
    this.favorites$ = this.favoritesService.favorites$;
  }

  ngOnInit() {
    this.loadFavorites();
  }

  /**
   * Carga la lista de favoritos
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
   * Maneja el click en favoritos (remover de la lista)
   */
  onFavoriteClick(project: any): void {
    // El ProjectCardComponent ya maneja la lógica de toggle
    // No necesitamos recargar, el servicio ya maneja la actualización automática
    console.log('Favorito removido:', project);
  }

  /**
   * Navegar al detalle del proyecto
   */
  onProjectClick(project: any): void {
    // Implementar navegación al detalle del proyecto
    console.log('Navegar a proyecto:', project);
  }

  /**
   * Convierte FavoriteProject a formato compatible con ProjectCard
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