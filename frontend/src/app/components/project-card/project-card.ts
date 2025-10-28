import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FavoritesService } from '../../services/favorites.service';
import { ModalService } from '../../services/modal.service';
import { AuthService } from '../../services/auth.service';

/**
 * Interfaz que define la estructura de datos de una tarjeta de proyecto
 * 
 * @description
 * Esta interfaz se utiliza para mostrar proyectos de forma consistente
 * en toda la aplicación. Incluye información del proyecto, vendedor,
 * y estado de favoritos.
 */
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

/**
 * Componente reutilizable para mostrar tarjetas de proyectos
 * 
 * @description
 * ProjectCard es un componente auto-suficiente que maneja:
 * - Navegación a detalles del proyecto (vista pública o vendedor)
 * - Gestión de favoritos con validación de autenticación
 * - Badges de estado y tipo de proyecto
 * - Información del vendedor
 * - Visualización de estadísticas (vistas, descargas, rating)
 * 
 * El componente detecta automáticamente si el usuario actual es propietario
 * del proyecto para mostrar la vista correcta y ocultar funciones irrelevantes.
 * 
 * @example
 * ```html
 * <!-- Vista pública (con favoritos) -->
 * <app-project-card [project]="project"></app-project-card>
 * 
 * <!-- Vista de propietario (sin favoritos, con estado) -->
 * <app-project-card 
 *   [project]="project" 
 *   [showOwnerActions]="true">
 * </app-project-card>
 * ```
 */

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-card.html',
  styleUrl: './project-card.scss'
})
export class ProjectCardComponent implements OnInit {
  /**
   * Datos del proyecto a mostrar en la tarjeta
   * 
   * @required
   * @description
   * Contiene toda la información del proyecto incluyendo título, descripción,
   * precio, imágenes, vendedor, y estado de favorito.
   */
  @Input() project!: ProjectCard;
  
  /**
   * Indica si mostrar acciones de propietario (estado, edición)
   * 
   * @default false
   * @description
   * Cuando es true, muestra badges de estado y oculta el botón de favoritos.
   * Se usa en la vista de "Mis Proyectos" del vendedor.
   */
  @Input() showOwnerActions: boolean = false;
  
  /**
   * Delay de animación para efectos escalonados
   * 
   * @default 0
   * @description
   * Permite crear efectos de animación en cascada cuando se muestran
   * múltiples tarjetas en un grid. Valor en segundos.
   */
  @Input() animationDelay: number = 0;

  /**
   * Servicio para gestionar favoritos del usuario
   * @private
   */
  private favoritesService = inject(FavoritesService);
  
  /**
   * Servicio para mostrar modales informativos
   * @private
   */
  private modalService = inject(ModalService);
  
  /**
   * Servicio de autenticación para validar usuario actual
   * @private
   */
  private authService = inject(AuthService);
  
  /**
   * Router para navegación programática
   * @private
   */
  private router = inject(Router);
  
  /**
   * Indica si hay una operación de favorito en curso
   * 
   * @description
   * Previene múltiples clicks mientras se procesa una petición HTTP.
   */
  isLoadingFavorite = false;

  /**
   * Determina si el usuario actual es el propietario del proyecto
   * 
   * @returns True si el usuario autenticado es el propietario del proyecto
   * 
   * @description
   * Compara el ID del usuario actual con el ID del vendedor del proyecto.
   * Se usa para detectar si mostrar vista de propietario automáticamente.
   */
  get isOwner(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser ? this.project.seller.id === parseInt(currentUser.id) : false;
  }

  /**
   * Determina si mostrar acciones de propietario en la tarjeta
   * 
   * @returns True si debe mostrar acciones de propietario
   * 
   * @description
   * Combina showOwnerActions manual con detección automática de propietario.
   * Se usa para mostrar badges de estado y ocultar favoritos en proyectos propios.
   */
  get shouldShowOwnerActions(): boolean {
    return this.showOwnerActions || this.isOwner;
  }

  /**
   * Hook de inicialización del componente
   * 
   * @description
   * Verifica y sincroniza el estado de favorito del proyecto con FavoritesService.
   * Se ejecuta al montar el componente.
   */
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
   * Maneja el click en la tarjeta del proyecto para navegar a detalles
   * 
   * @description
   * Navega directamente a la vista de detalles del proyecto.
   * Detecta automáticamente si el usuario es propietario para redirigir a:
   * - `/vendedor/proyecto/:id` si es propietario
   * - `/proyecto/:id` si es vista pública
   */
  onProjectClick(): void {
    const currentUser = this.authService.getCurrentUser();
    
    // Si el usuario actual es el propietario → vista de vendedor
    if (currentUser && this.project.seller.id === parseInt(currentUser.id)) {
      this.router.navigate(['/vendedor/proyecto', this.project.id]);
    } else {
      // Vista pública para otros usuarios
      this.router.navigate(['/proyecto', this.project.id]);
    }
  }

  /**
   * Maneja el click en el botón de favoritos
   * 
   * @param event - Evento del click (se detiene la propagación)
   * 
   * @description
   * Agrega o remueve el proyecto de favoritos del usuario.
   * Incluye validaciones de:
   * - Autenticación (redirige a /login si no está autenticado)
   * - Proyectos propios (muestra modal explicativo)
   * - Múltiples clicks (previene con isLoadingFavorite)
   * 
   * El estado de favorito se actualiza inmediatamente en la UI y
   * se sincroniza con el backend mediante FavoritesService.
   */
  onFavoriteClick(event: Event): void {
    event.stopPropagation();
    
    if (this.isLoadingFavorite) return;
    
    // Validar autenticación
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
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
   * Muestra modal cuando el usuario intenta agregar su propio proyecto a favoritos
   * 
   * @private
   * @description
   * Informa al usuario que los favoritos son para guardar proyectos de otros,
   * no los propios.
   */
  private showOwnProjectAlert(): void {
    this.modalService.showModal(
      'No puedes agregar a favoritos',
      'Los favoritos son para guardar proyectos de otros usuarios que te interesen. No puedes agregar tus propios proyectos.'
    );
  }

  /**
   * Maneja errores de carga de imagen estableciendo un placeholder
   * 
   * @param event - Evento del error de imagen
   * 
   * @description
   * Cuando falla la carga de la imagen del proyecto, establece un placeholder
   * gris con texto "Sin Imagen".
   */
  onImageError(event: any): void {
    event.target.src = 'https://via.placeholder.com/400x300/e5e7eb/6b7280?text=Sin+Imagen';
  }

  /**
   * Obtiene el label legible del tipo de proyecto
   * 
   * @param type - Tipo de proyecto en formato MAYUSCULAS_CON_GUIONES
   * @returns Etiqueta legible del tipo de proyecto
   * 
   * @description
   * Convierte tipos de proyectos de la base de datos a texto presentable.
   * 
   * @example
   * ```typescript
   * getProjectTypeLabel('PROYECTO_FINAL') // Returns: 'Proyecto Final'
   * ```
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
   * Obtiene la clase CSS del badge según el tipo de proyecto
   * 
   * @param type - Tipo de proyecto
   * @returns Nombre de la clase CSS del badge
   * 
   * @description
   * Cada tipo de proyecto tiene un color distintivo:
   * - SOFTWARE: verde (success)
   * - INVESTIGACION: amarillo (warning)
   * - PROYECTO_FINAL: azul (primary)
   * - TESIS: morado (purple)
   * - ENSAYO: cyan (info)
   * - PRESENTACION: naranja (orange)
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
   * Obtiene la clase CSS del badge según el estado del proyecto
   * 
   * @param status - Estado del proyecto (para proyectos propios)
   * @returns Nombre de la clase CSS del badge de estado
   * 
   * @description
   * Solo se usa en vista de propietario (showOwnerActions=true).
   * Estados disponibles:
   * - PUBLISHED: verde (publicado y visible)
   * - DRAFT: amarillo (borrador)
   * - PENDING: azul (pendiente de aprobación)
   * - REJECTED: rojo (rechazado)
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
   * Obtiene el label legible del estado del proyecto
   * 
   * @param status - Estado del proyecto
   * @returns Etiqueta legible del estado
   * 
   * @description
   * Convierte estados de la base de datos a texto en español.
   * 
   * @example
   * ```typescript
   * getStatusLabel('PUBLISHED') // Returns: 'Publicado'
   * ```
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