import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { FavoritesService } from '../../services/favorites.service';
import { SearchHistoryService, SearchHistoryItem, PopularSearch } from '../../services/search-history.service';
import { LoggerService } from '../../services/logger.service';
import { Navbar } from '../../components/navbar/navbar';
import { ProjectCardComponent, ProjectCard } from '../../components/project-card/project-card';

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
   * Mensaje de error al cargar proyectos destacados
   * 
   * @description
   * Se muestra cuando falla la petición HTTP de proyectos.
   * Permite al usuario reintentar la carga.
   */
  errorLoadingProjects: string | null = null;

  /**
   * Mensaje de error al cargar categorías populares
   * 
   * @description
   * Se muestra cuando falla la petición HTTP de categorías.
   * Permite al usuario reintentar la carga.
   */
  errorLoadingCategories: string | null = null;

  /**
   * Array de búsquedas recientes del usuario autenticado
   * 
   * @description
   * Se carga desde la API y se muestra solo para usuarios logueados.
   * Limitado a 3-5 búsquedas más recientes.
   */
  recentSearches: SearchHistoryItem[] = [];

  /**
   * Array de búsquedas populares predefinidas (hardcodeadas)
   * 
   * @description
   * Se muestran SOLO para usuarios NO autenticados.
   * Son términos estáticos definidos en el código, no se cargan de la base de datos.
   */
  popularSearches: PopularSearch[] = [
    { termino: 'Tesis de sistemas', count: 0 },
    { termino: 'Proyectos de ingeniería', count: 0 },
    { termino: 'Investigación de mercado', count: 0 }
  ];

  /**
   * Servicio para gestionar proyectos favoritos del usuario
   * 
   * @description
   * Se inyecta usando inject() para sincronizar estados de favoritos
   * entre ProjectCardComponent y la página home.
   * 
   * IMPORTANTE: Este servicio se usa internamente en transformProjectData()
   * para sincronizar el estado inicial de favoritos al cargar proyectos.
   * No se usa directamente en el template HTML.
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
    private router: Router,
    private sanitizer: DomSanitizer,
    private searchHistoryService: SearchHistoryService,
    private logger: LoggerService
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
   * 3. Carga categorías populares PRIMERO (importante para filtrado de proyectos)
   * 4. Carga proyectos destacados DESPUÉS (usa las categorías para filtrar)
   * 
   * @private
   * @async
   */
  private async initializeComponent(): Promise<void> {
    // Suscribirse al usuario actual
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      
      // Cargar búsquedas recientes si está autenticado
      if (user) {
        this.loadRecentSearches();
      }
    });

    // Cargar favoritos primero para sincronizar estados
    if (this.authService.isAuthenticated()) {
      await this.favoritesService.loadFavorites().toPromise();
    }

    // IMPORTANTE: Cargar categorías PRIMERO (necesarias para filtrar proyectos)
    await this.loadPopularCategories();
    
    // Luego cargar proyectos (ya con las categorías disponibles)
    await this.loadFeaturedProjects();
  }

  /**
   * Carga las categorías populares para mostrar en el hero section
   * 
   * @description
   * Lógica de carga:
   * 1. Si el usuario está autenticado:
   *    - Primero carga sus categorías preferidas
   *    - Completa con categorías ordenadas por ordenDisplay hasta llegar a 6
   * 2. Si NO está autenticado:
   *    - Carga las 6 categorías ordenadas por ordenDisplay
   * 
   * @public
   * @async
   */
  async loadPopularCategories(): Promise<void> {
    this.loadingCategories = true;
    this.errorLoadingCategories = null; // Limpiar error anterior
    
    try {
      this.logger.log('Cargando categorías populares');
      
      // Obtener todas las categorías disponibles
      const response = await this.apiService.get('/projects/categories').toPromise();

      if (!response?.success || !response.data) {
        this.logger.warn('No se pudieron cargar categorías desde la API');
        this.popularCategories = [];
        return;
      }

      const allCategories = response.data as CategoryDB[];
      let selectedCategories: CategoryDB[] = [];

      // Si el usuario está autenticado, cargar sus categorías preferidas
      if (this.currentUser) {
        try {
          const preferredResponse = await this.apiService.get(`/auth/user/${this.currentUser.id}/preferred-categories`).toPromise();
          
          if (preferredResponse?.success && Array.isArray(preferredResponse.data) && preferredResponse.data.length > 0) {
            this.logger.debug('Categorías preferidas obtenidas', preferredResponse.data.length);
            
            // Agregar las categorías preferidas primero
            const preferredCategoryIds = preferredResponse.data.map((pc: any) => pc.categoriaId);
            const preferredCategories = allCategories.filter(cat => preferredCategoryIds.includes(cat.id));
            selectedCategories.push(...preferredCategories);
            
            this.logger.debug('Categorías preferidas agregadas', preferredCategories.length);
          }
        } catch (error) {
          this.logger.warn('No se pudieron cargar categorías preferidas');
          // Continuar sin categorías preferidas
        }
      }

      // Completar con categorías por orden_display hasta llegar a 6
      const remainingSlots = 6 - selectedCategories.length;
      if (remainingSlots > 0) {
        const selectedIds = new Set(selectedCategories.map(cat => cat.id));
        const remainingCategories = allCategories
          .filter(cat => !selectedIds.has(cat.id))
          .sort((a, b) => (a.ordenDisplay || 999) - (b.ordenDisplay || 999))
          .slice(0, remainingSlots);
        
        selectedCategories.push(...remainingCategories);
        this.logger.debug('Categorías adicionales agregadas', remainingCategories.length);
      }

      this.popularCategories = selectedCategories.slice(0, 6);
      this.logger.success('Categorías cargadas correctamente', this.popularCategories.length);
      
    } catch (error) {
      this.logger.error('Error cargando categorías populares', error);
      this.errorLoadingCategories = 'No se pudieron cargar las categorías. Por favor, intenta nuevamente.';
      this.popularCategories = [];
    } finally {
      this.loadingCategories = false;
    }
  }

  /**
   * Carga proyectos destacados desde la API con lógica de priorización
   * 
   * @description
   * Lógica de ordenamiento:
   * 1. Si el usuario está autenticado:
   *    - Primero: Proyectos de categorías preferidas (más recientes a más antiguos)
   *    - Segundo: Resto de proyectos destacados (más recientes a más antiguos)
   * 2. Si NO está autenticado:
   *    - Proyectos destacados ordenados por fecha (más recientes primero)
   * 
   * Siempre se muestran hasta 6 proyectos en total.
   * 
   * @public
   * @async
   */
  async loadFeaturedProjects(): Promise<void> {
    this.isLoading = true;
    this.errorLoadingProjects = null; // Limpiar error anterior
    
    try {
      this.logger.log('Cargando proyectos destacados');
      const response = await this.apiService.getFeaturedProjects(20).toPromise();

      if (response?.success && response.data) {
        let allProjects = response.data;
        
        // Ordenar todos los proyectos por fecha de creación (más recientes primero)
        allProjects.sort((a: any, b: any) => {
          const dateA = new Date(a.fechaCreacion || a.fechaActualizacion || 0).getTime();
          const dateB = new Date(b.fechaCreacion || b.fechaActualizacion || 0).getTime();
          return dateB - dateA; // Descendente (más reciente primero)
        });

        // Si el usuario está autenticado, priorizar por categorías preferidas
        if (this.currentUser && this.popularCategories.length > 0) {
          const preferredCategoryNames = this.popularCategories
            .slice(0, 3)
            .map(cat => cat.nombre.toLowerCase());

          this.logger.debug('Aplicando filtro de categorías preferidas', preferredCategoryNames.length);

          // Separar proyectos en dos grupos
          const preferredProjects = allProjects.filter((project: any) => 
            preferredCategoryNames.includes(project.category?.nombre?.toLowerCase() || '')
          );

          const otherProjects = allProjects.filter((project: any) => 
            !preferredCategoryNames.includes(project.category?.nombre?.toLowerCase() || '')
          );

          this.logger.debug('Proyectos filtrados', { preferred: preferredProjects.length, other: otherProjects.length });

          // Combinar: primero preferidos, luego el resto, y transformar
          const combinedProjects = [...preferredProjects, ...otherProjects].slice(0, 6);
          this.featuredProjects = combinedProjects.map((projectData: any) => this.transformProjectData(projectData));
        } else {
          // Usuario no autenticado: simplemente los 6 más recientes
          this.featuredProjects = allProjects.slice(0, 6).map((projectData: any) => this.transformProjectData(projectData));
        }

        this.logger.success('Proyectos destacados cargados', this.featuredProjects.length);
      } else {
        this.logger.warn('No hay proyectos destacados disponibles');
        this.featuredProjects = [];
      }
    } catch (error) {
      this.logger.error('Error cargando proyectos destacados', error);
      this.errorLoadingProjects = 'No se pudieron cargar los proyectos destacados. Por favor, intenta nuevamente.';
      this.featuredProjects = [];
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
   * También guarda la búsqueda en el historial si el usuario está autenticado.
   */
  onSearch(): void {
    if (this.searchQuery.trim()) {
      // Guardar en historial si está autenticado
      if (this.currentUser) {
        this.searchHistoryService.saveSearch(this.searchQuery.trim()).subscribe();
      }
      
      this.router.navigate(['/explorar'], { 
        queryParams: { q: this.searchQuery.trim() }
      });
    }
  }

  /**
   * Navega a /explorar con un término de búsqueda predefinido
   * 
   * @description
   * Se usa para las búsquedas populares y recientes mostradas debajo de la barra principal.
   * También guarda la búsqueda en el historial si el usuario está autenticado.
   * 
   * @param searchTerm - Término de búsqueda predefinido
   */
  onPopularSearch(searchTerm: string): void {
    // Guardar en historial si está autenticado
    if (this.currentUser) {
      this.searchHistoryService.saveSearch(searchTerm).subscribe();
    }
    
    this.router.navigate(['/explorar'], { 
      queryParams: { q: searchTerm }
    });
  }

  /**
   * Carga las búsquedas recientes del usuario autenticado
   * 
   * @description
   * Obtiene las últimas 3 búsquedas del usuario desde la API.
   * Solo se ejecuta si hay un usuario autenticado.
   * 
   * @private
   */
  private loadRecentSearches(): void {
    this.searchHistoryService.loadRecentSearches(3).subscribe(
      searches => {
        this.recentSearches = searches;
      }
    );
  }



  /**
   * Elimina una búsqueda específica del historial del usuario
   * 
   * @description
   * Desactiva la búsqueda en la base de datos (soft delete).
   * Recarga automáticamente las búsquedas recientes para mostrar la siguiente disponible.
   * Esto mantiene siempre 3 búsquedas visibles (si existen).
   * 
   * @param searchId - ID de la búsqueda a eliminar
   */
  removeRecentSearch(searchId: number): void {
    this.searchHistoryService.removeSearch(searchId).subscribe(
      () => {
        this.logger.log('Búsqueda eliminada');
        // Recargar las búsquedas recientes para traer la siguiente disponible
        this.loadRecentSearches();
      },
      error => {
        this.logger.error('Error al eliminar búsqueda', error);
      }
    );
  }

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
      this.logger.warn('Navbar no está disponible, navegando a /explorar como fallback');
      this.router.navigate(['/explorar']);
    }
  }

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

  /**
   * Sanitiza el HTML del icono de categoría para renderizar SVG de forma segura
   */
  getSafeHtml(html: string | undefined): SafeHtml {
    if (!html) {
      const defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';
      return this.sanitizer.bypassSecurityTrustHtml(defaultIcon);
    }
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Hace scroll suave hacia la sección de categorías
   * 
   * @description
   * Se activa al hacer click en el botón flotante de la parte inferior del hero.
   * Desplaza la vista hasta la sección de categorías, posicionándola debajo del navbar.
   */
  scrollToCategories(): void {
    const categoriesSection = document.getElementById('categories-section');
    if (categoriesSection) {
      const navbarHeight = 80; // 5rem = 80px (altura del navbar)
      const elementPosition = categoriesSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

}