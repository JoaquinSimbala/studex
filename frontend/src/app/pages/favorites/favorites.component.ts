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

  // ========================================
  // ✅ MÉTODOS ELIMINADOS - Ya no son necesarios
  // ========================================
  // ProjectCardComponent ahora maneja toda la navegación y favoritos internamente
  // Estos métodos eran innecesarios:
  //
  // onFavoriteClick(project: any): void {
  //   console.log('Favorito removido:', project);
  // }
  //
  // onProjectClick(project: any): void {
  //   console.log('Navegar a proyecto:', project);
  // }

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