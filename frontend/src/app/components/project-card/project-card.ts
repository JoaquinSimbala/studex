import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FavoritesService } from '../../services/favorites.service';
import { ModalService } from '../../services/modal.service';
import { AuthService } from '../../services/auth.service';

export interface ProjectCard {
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
  downloads?: number;
  mainImage?: {
    fileUrl: string;
    fileName: string;
  } | null;
  isFavorite: boolean;
  seller: {
    id: number;
    name: string;
    avatar?: string;
    rating: number;
    salesCount: number;
  };
  status?: string; // Para proyectos del vendedor
  featured?: boolean;
}

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-card.html',
  styleUrl: './project-card.scss'
})
export class ProjectCardComponent implements OnInit {
  @Input() project!: ProjectCard;
  @Input() showOwnerActions: boolean = false; // Para "Mis Proyectos"
  @Input() animationDelay: number = 0; // Para animaciones escalonadas
  
  @Output() projectClick = new EventEmitter<ProjectCard>();
  @Output() favoriteClick = new EventEmitter<ProjectCard>();

  private favoritesService = inject(FavoritesService);
  private modalService = inject(ModalService);
  private authService = inject(AuthService);
  isLoadingFavorite = false;

  /**
   * Getter para determinar si el usuario actual es el propietario del proyecto
   */
  get isOwner(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser ? this.project.seller.id === parseInt(currentUser.id) : false;
  }

  /**
   * Getter para determinar si mostrar acciones de propietario
   * Combina showOwnerActions manual con detección automática de propietario
   * Usado para badges de estado y ocultar favoritos en proyectos propios
   */
  get shouldShowOwnerActions(): boolean {
    return this.showOwnerActions || this.isOwner;
  }

  ngOnInit() {
    // Verificar si el proyecto está en favoritos al cargar el componente
    if (this.project) {
      // Inicializar como no favorito por defecto
      this.project.isFavorite = false;
      
      // Luego verificar el estado real desde el servicio
      if (this.favoritesService.isFavorite(this.project.id)) {
        this.project.isFavorite = true;
      }
      
      console.log(`🔍 Estado inicial proyecto ${this.project.id}:`, this.project.isFavorite ? 'Favorito' : 'No favorito');
    }
  }

  /**
   * Maneja el click en la carta del proyecto
   */
  onProjectClick(): void {
    this.projectClick.emit(this.project);
  }

  /**
   * Maneja el click en favoritos (evita propagación)
   */
  onFavoriteClick(event: Event): void {
    event.stopPropagation();
    
    if (this.isLoadingFavorite) return;
    
    this.isLoadingFavorite = true;
    
    // Lógica directa: si no es favorito → agregar, si es favorito → remover
    if (!this.project.isFavorite) {
      // AGREGAR a favoritos
      console.log('➕ Agregando a favoritos...');
      this.favoritesService.addToFavorites(this.project.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.project.isFavorite = true; // Corazón rojo
            console.log('✅ Agregado a favoritos - Corazón rojo');
          }
          this.isLoadingFavorite = false;
        },
        error: (error) => {
          console.error('❌ Error agregando:', error);
          if (error.error && error.error.code === 'OWN_PROJECT') {
            this.showOwnProjectAlert();
          }
          this.isLoadingFavorite = false;
        }
      });
    } else {
      // REMOVER de favoritos  
      console.log('➖ Removiendo de favoritos...');
      this.favoritesService.removeFromFavorites(this.project.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.project.isFavorite = false; // Corazón sin rojo
            console.log('✅ Removido de favoritos - Corazón sin rojo');
          }
          this.isLoadingFavorite = false;
        },
        error: (error) => {
          console.error('❌ Error removiendo:', error);
          this.isLoadingFavorite = false;
        }
      });
    }
  }

  /**
   * Muestra modal cuando el usuario intenta agregar su propio proyecto
   */
  private showOwnProjectAlert(): void {
    this.modalService.showModal(
      'No puedes agregar a favoritos',
      'Los favoritos son para guardar proyectos de otros usuarios que te interesen. No puedes agregar tus propios proyectos.'
    );
  }

  /**
   * Maneja errores de imagen
   */
  onImageError(event: any): void {
    event.target.src = 'https://via.placeholder.com/400x300/e5e7eb/6b7280?text=Sin+Imagen';
  }

  /**
   * Obtiene el label del tipo de proyecto
   */
  getProjectTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'SOFTWARE': 'Software',
      'INVESTIGACION': 'Investigación',
      'PROYECTO_FINAL': 'Proyecto Final',
      'TESIS': 'Tesis',
      'ENSAYO': 'Ensayo',
      'PRESENTACION': 'Presentación'
    };
    return typeLabels[type] || type;
  }

  /**
   * Obtiene las clases CSS para el badge del tipo
   */
  getTypeBadgeClass(type: string): string {
    const badgeClasses: { [key: string]: string } = {
      'SOFTWARE': 'success',
      'INVESTIGACION': 'warning',
      'PROYECTO_FINAL': 'primary',
      'TESIS': 'purple',
      'ENSAYO': 'info',
      'PRESENTACION': 'orange'
    };
    return badgeClasses[type] || 'primary';
  }

  /**
   * Obtiene las clases CSS para el estado del proyecto (solo para proyectos propios)
   */
  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'PUBLISHED': 'success',
      'DRAFT': 'warning',
      'PENDING': 'info',
      'REJECTED': 'danger'
    };
    return statusClasses[status] || 'secondary';
  }

  /**
   * Obtiene el label del estado del proyecto
   */
  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'PUBLISHED': 'Publicado',
      'DRAFT': 'Borrador',
      'PENDING': 'Pendiente',
      'REJECTED': 'Rechazado'
    };
    return statusLabels[status] || status;
  }
}