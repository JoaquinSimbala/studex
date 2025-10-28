import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { FavoritesService } from '../../services/favorites.service';
import { Navbar } from '../../components/navbar/navbar';
import { ProjectCardComponent, ProjectCard } from '../../components/project-card/project-card';

// ========================================
// ❌ INTERFAZ NO UTILIZADA - Comentada para referencia futura
// ========================================
// Esta interfaz fue diseñada para filtros rápidos pero no se implementó en el template
// Se mantiene comentada por si se decide implementar en el futuro
//
// interface QuickFilter {
//   id: string;
//   name: string;
//   type: string;
//   icon?: string;
// }

/**
 * Interfaz para categorías desde la base de datos
 * 
 * @description
 * Define la estructura de las categorías que se obtienen desde el backend.
 * Se utiliza para mostrar las categorías populares en el hero section.
 */
interface CategoryDB {
  /** Identificador único de la categoría */
  id: number;
  /** Nombre de la categoría */
  nombre: string;
  /** Descripción opcional de la categoría */
  descripcion?: string;
  /** Emoji o icono de la categoría */
  icono?: string;
  /** Color hexadecimal de la categoría */
  colorHex: string;
  /** Orden de visualización (menor = mayor prioridad) */
  ordenDisplay?: number;
}

/**
 * Componente principal de la página de inicio de STUDEX
 * 
 * @description
 * Gestiona la landing page de la plataforma, incluyendo:
 * - Hero section con búsqueda principal
 * - Categorías populares desde la base de datos
 * - Grid de proyectos destacados
 * - Estadísticas de la plataforma
 * - Footer con navegación y redes sociales
 * 
 * El componente se integra con ProjectCardComponent para mostrar proyectos
 * de forma consistente con el resto de la aplicación.
 * 
 * @example
 * ```html
 * <app-home></app-home>
 * ```
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Navbar, ProjectCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {

  /**
   * Referencia al componente Navbar para acceder a sus métodos públicos
   * 
   * @description
   * Permite llamar al método openCategoriesModal() del navbar desde el footer.
   * Se utiliza ViewChild para obtener acceso directo al componente hijo.
   */
  @ViewChild(Navbar) navbar!: Navbar;

  /**
   * Usuario actualmente autenticado en la plataforma
   * 
   * @description
   * Se obtiene mediante suscripción al observable currentUser$ de AuthService.
   * Null si el usuario no está autenticado.
   */
  currentUser: User | null = null;

  /**
   * Texto ingresado en la barra de búsqueda principal
   * 
   * @description
   * Se vincula con [(ngModel)] en el input de búsqueda del hero section.
   * Se envía a la página /explorar al ejecutar onSearch().
   */
  searchQuery = '';

  /**
   * Array de proyectos destacados mostrados en la página principal
   * 
   * @description
   * Se cargan desde la API mediante loadFeaturedProjects().
   * Limitado a 6 proyectos destacados transformados a formato ProjectCard.
   */
  featuredProjects: ProjectCard[] = [];

  /**
   * Indica si se están cargando los proyectos destacados
   * 
   * @description
   * Controla el spinner de carga en la sección de proyectos.
   * True durante la petición HTTP, false al completar o fallar.
   */
  isLoading = false;

  /**
   * Array de categorías populares cargadas desde la base de datos
   * 
   * @description
   * Se muestra en el hero section, limitado a 5 categorías.
   * Ordenadas por la propiedad ordenDisplay de la base de datos.
   */
  popularCategories: CategoryDB[] = [];

  /**
   * Indica si se están cargando las categorías desde la API
   * 
   * @description
   * Controla el spinner de carga en la sección de categorías populares.
   */
  loadingCategories = false;

  /**
   * Servicio para gestionar proyectos favoritos del usuario
   * 
   * @description
   * Se inyecta usando inject() para sincronizar estados de favoritos
   * entre ProjectCardComponent y la página home.
   */
  private favoritesService = inject(FavoritesService);

  /**
   * Constructor del componente Home
   * 
   * @param authService - Servicio de autenticación de usuarios
   * @param apiService - Servicio para realizar peticiones HTTP a la API
   * @param router - Router de Angular para navegación entre páginas
   */
  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  /**
   * Hook de ciclo de vida que se ejecuta al inicializar el componente
   * 
   * @description
   * Llama a initializeComponent() para cargar todos los datos necesarios.
   */
  ngOnInit(): void {
    this.initializeComponent();
  }

  /**
   * Inicializa el componente cargando datos necesarios de forma asíncrona
   * 
   * @description
   * Realiza las siguientes operaciones en orden:
   * 1. Suscribe al usuario actual del AuthService
   * 2. Carga favoritos del usuario si está autenticado
   * 3. Carga categorías populares y proyectos destacados en paralelo
   * 
   * @private
   * @async
   */
  private async initializeComponent(): Promise<void> {
    // Suscribirse al usuario actual
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Cargar favoritos primero para sincronizar estados
    if (this.authService.isAuthenticated()) {
      await this.favoritesService.loadFavorites().toPromise();
    }

    // Cargar categorías populares y proyectos destacados
    await Promise.all([
      this.loadPopularCategories(),
      this.loadFeaturedProjects()
    ]);
  }

  /**
   * Carga las 5 categorías más populares desde la base de datos
   * 
   * @description
   * Las categorías se ordenan por la propiedad ordenDisplay y se limitan a 5.
   * Si falla la petición a la API, se establece un array vacío.
   * Controla el estado de carga mediante loadingCategories.
   * 
   * @private
   * @async
   */
  private async loadPopularCategories(): Promise<void> {
    this.loadingCategories = true;
    
    try {
      console.log('🔄 Cargando categorías populares desde API...');
      const response = await this.apiService.get('/projects/categories').toPromise();

      if (response?.success && response.data) {
        // Ordenar por ordenDisplay y tomar las primeras 5
        const allCategories = response.data as CategoryDB[];
        this.popularCategories = allCategories
          .sort((a, b) => (a.ordenDisplay || 999) - (b.ordenDisplay || 999))
          .slice(0, 5);
        
        console.log('✅ Categorías populares cargadas:', this.popularCategories.length);
        console.log('📂 Categorías:', this.popularCategories);
      } else {
        console.warn('⚠️ No se pudieron cargar categorías desde la API');
        this.popularCategories = [];
      }
    } catch (error) {
      console.error('❌ Error cargando categorías populares:', error);
      this.popularCategories = [];
    } finally {
      this.loadingCategories = false;
    }
  }

  /**
   * Carga hasta 6 proyectos destacados desde la API
   * 
   * @description
   * Los proyectos se transforman usando transformProjectData() para adaptarlos
   * a la interfaz ProjectCard. Si falla la petición, se muestra un array vacío.
   * No se utilizan datos mock, se prefiere mostrar estado vacío.
   * 
   * @private
   * @async
   */
  private async loadFeaturedProjects(): Promise<void> {
    this.isLoading = true;
    
    try {
      console.log('🔄 Cargando proyectos destacados desde API...');
      const response = await this.apiService.getFeaturedProjects(6).toPromise();

      console.log('📡 Respuesta de API:', response);

      if (response?.success && response.data) {
        this.featuredProjects = response.data.map((projectData: any) => this.transformProjectData(projectData));
        console.log('✅ Proyectos destacados cargados desde BD:', this.featuredProjects.length);
        console.log('📚 Proyectos transformados:', this.featuredProjects);
      } else {
        console.warn('⚠️ No hay proyectos destacados disponibles en la BD');
        this.featuredProjects = [];
      }
    } catch (error) {
      console.error('❌ Error cargando proyectos destacados:', error);
      // No usar datos mock - dejar vacío si falla la API
      this.featuredProjects = [];
      console.log('⚠️ No se pudieron cargar proyectos destacados de la BD');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Función trackBy para optimizar el renderizado de la lista de proyectos
   * 
   * @description
   * Angular usa esta función para determinar qué elementos de la lista han cambiado,
   * mejorando el rendimiento al re-renderizar solo los elementos modificados.
   * 
   * @param index - Índice del elemento en el array
   * @param project - Objeto del proyecto
   * @returns ID único del proyecto para tracking
   */
  trackByProjectId(index: number, project: ProjectCard): number {
    return project.id;
  }

  /**
   * Transforma datos del proyecto desde formato API a formato ProjectCard
   * 
   * @description
   * Realiza las siguientes transformaciones:
   * - Mapea campos de la BD a la interfaz ProjectCard
   * - Establece valores por defecto para campos opcionales
   * - Sincroniza el estado de favorito con FavoritesService
   * - Genera avatar del vendedor si no existe
   * 
   * @param projectData - Datos crudos del proyecto desde la API
   * @returns Proyecto transformado en formato ProjectCard
   * @private
   */
  private transformProjectData(projectData: any): ProjectCard {
    return {
      id: projectData.id,
      title: projectData.title,
      description: projectData.description,
      price: Number(projectData.price),
      type: projectData.type,
      university: projectData.university,
      category: projectData.category?.nombre || projectData.subject || 'General',
      year: projectData.year,
      rating: projectData.averageRating || 4.5,
      views: projectData.views || 0,
      mainImage: projectData.mainImage || (projectData.images?.[0] ? { fileUrl: projectData.images[0].fileUrl, fileName: projectData.images[0].fileName } : null),
      isFavorite: this.authService.isAuthenticated() ? this.favoritesService.isFavorite(projectData.id) : false, // Sincronizar con estado real de favoritos
      seller: {
        id: projectData.seller.id,
        name: projectData.seller.name || `${projectData.seller.nombre || ''} ${projectData.seller.apellidos || ''}`.trim(),
        avatar: projectData.seller.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(projectData.seller.name || 'Usuario')}&background=007bff&color=ffffff&size=40`,
        rating: Number(projectData.seller.rating || projectData.seller.calificacionVendedor || 4.0),
        salesCount: projectData.seller.salesCount || projectData.seller.totalVentas || 0
      }
    };
  }

  /**
   * Ejecuta búsqueda navegando a /explorar con el término ingresado
   * 
   * @description
   * Se activa al presionar Enter en el input de búsqueda o al hacer clic en el botón.
   * Solo navega si hay texto ingresado (excluyendo espacios vacíos).
   */
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/explorar'], { 
        queryParams: { q: this.searchQuery.trim() }
      });
    }
  }

  /**
   * Navega a /explorar con un término de búsqueda predefinido
   * 
   * @description
   * Se usa para las búsquedas populares mostradas debajo de la barra principal.
   * 
   * @param searchTerm - Término de búsqueda predefinido
   * 
   * @example
   * ```typescript
   * onPopularSearch('Tesis de sistemas')
   * ```
   */
  onPopularSearch(searchTerm: string): void {
    this.router.navigate(['/explorar'], { 
      queryParams: { q: searchTerm }
    });
  }

  // ========================================
  // ❌ MÉTODO NO UTILIZADO - Comentado para referencia futura
  // ========================================
  // Este método fue diseñado para aplicar filtros rápidos pero no se usa en el template actual
  //
  // applyQuickFilter(filter: QuickFilter): void {
  //   this.router.navigate(['/explorar'], { 
  //     queryParams: { [filter.type]: filter.id }
  //   });
  // }

  /**
   * Navega a /explorar con una categoría seleccionada como filtro
   * 
   * @description
   * Se activa al hacer clic en cualquiera de las categorías populares del hero section.
   * 
   * @param category - Categoría seleccionada
   * 
   * @example
   * ```typescript
   * selectPopularCategory({ id: 1, nombre: 'Software', colorHex: '#3B82F6' })
   * ```
   */
  selectPopularCategory(category: CategoryDB): void {
    this.router.navigate(['/explorar'], { 
      queryParams: { category: category.nombre }
    });
  }

  /**
   * Abre el modal de categorías del navbar mediante ViewChild
   * 
   * @description
   * Este método se llama desde el footer cuando se hace clic en "Categorías".
   * Usa ViewChild para acceder al componente Navbar y llamar a su método openCategoriesModal().
   * Si el navbar no está disponible, navega a /explorar como fallback.
   * 
   * @see Navbar.openCategoriesModal
   */
  openCategoriesModal(): void {
    if (this.navbar) {
      this.navbar.openCategoriesModal();
    } else {
      console.warn('⚠️ Navbar no está disponible, navegando a /explorar como fallback');
      this.router.navigate(['/explorar']);
    }
  }

  // ========================================
  // ✅ MÉTODOS ELIMINADOS - Ya no son necesarios
  // ========================================
  // ProjectCardComponent ahora maneja toda la navegación y favoritos internamente.
  // Estos métodos eran duplicados e innecesarios:
  //
  // viewProject(project: ProjectCard): void {
  //   if (this.currentUser && project.seller.id === parseInt(this.currentUser.id)) {
  //     this.router.navigate(['/vendedor/proyecto', project.id]);
  //   } else {
  //     this.router.navigate(['/proyecto', project.id]);
  //   }
  // }
  //
  // handleFavoriteClick(project: ProjectCard): void {
  //   if (!this.currentUser) {
  //     this.router.navigate(['/login']);
  //     return;
  //   }
  //   console.log('Favorito toggled para proyecto:', project.id);
  // }

  /**
   * Navega a la página de exploración de todos los proyectos
   * 
   * @description
   * Se usa en múltiples lugares:
   * - Botón "Ver Todos los Proyectos" del encabezado de sección
   * - Estado vacío cuando no hay proyectos destacados disponibles
   */
  viewAllProjects(): void {
    this.router.navigate(['/explorar']);
  }

  /**
   * Navega a /explorar para ver más proyectos
   * 
   * @description
   * Se usa en el botón "Ver Todos los Proyectos" al final de la lista de destacados.
   * Actualmente solo navega a /explorar, no carga más proyectos en la misma página.
   */
  loadMoreProjects(): void {
    this.router.navigate(['/explorar']);
  }

  // ========================================
  // ❌ MÉTODOS NO UTILIZADOS - Comentados para referencia futura
  // ========================================
  // ProjectCardComponent maneja internamente el formateo de tipos y errores de imagen
  // Estos métodos no se usan en el template actual de home
  //
  // getProjectTypeLabel(type: string): string {
  //   const typeLabels: { [key: string]: string } = {
  //     'SOFTWARE': 'Software',
  //     'INVESTIGACION': 'Investigación',
  //     'PROYECTO_FINAL': 'Proyecto Final',
  //     'TEXTO_ARGUMENTATIVO': 'Ensayo',
  //     'PRESENTACION': 'Presentación',
  //     'ANALISIS_CASO': 'Análisis de Caso',
  //     'OTRO': 'Otro'
  //   };
  //   return typeLabels[type] || type;
  // }
  //
  // onImageError(event: any): void {
  //   console.log('Error cargando imagen, usando placeholder');
  //   event.target.src = 'https://via.placeholder.com/400x300/e5e7eb/6b7280?text=Sin+Imagen';
  // }
}