# 🔧 PROPUESTA DE REFACTORIZACIÓN: ProjectCard

## 📋 RESUMEN EJECUTIVO

El componente `ProjectCardComponent` está bien diseñado y es genérico, pero su integración con las páginas tiene **código duplicado** y **lógica redundante**.

---

## ⚠️ PROBLEMAS ACTUALES

### 1. **Duplicación de Código**
- `viewProject()` se repite en **Home** y **Explore** (código idéntico)
- `handleFavoriteClick()` se repite en **Home** y **Explore** (código idéntico)
- `trackByProjectId()` se repite en **Home** y **Explore**
- **Seller Projects** no usa `ProjectCardComponent`, duplica 200+ líneas

### 2. **Inconsistencias de Nombres**
- Home/Explore: `handleFavoriteClick` + `viewProject`
- Favorites: `onFavoriteClick` + `onProjectClick`

### 3. **Lógica Redundante**
Los handlers en las páginas NO hacen nada útil:
```typescript
// ❌ ProjectCard ya maneja todo esto
handleFavoriteClick(project: ProjectCard): void {
  if (!this.currentUser) {
    this.router.navigate(['/login']);  // ← ProjectCard ya hace esto
    return;
  }
  console.log('Favorito toggled');  // ← Solo logging inútil
}
```

### 4. **Eventos No Necesarios**
`ProjectCardComponent` emite:
- `projectClick` → Las páginas lo usan para navegar
- `favoriteClick` → Las páginas NO hacen nada útil con esto

---

## ✅ SOLUCIÓN RECOMENDADA

### **OPCIÓN A: ProjectCard Autosuficiente (Recomendada)**

**ProjectCard maneja TODA la lógica internamente:**

#### `project-card.ts` actualizado:

```typescript
@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-card.html',
  styleUrl: './project-card.scss'
})
export class ProjectCardComponent implements OnInit {
  @Input() project!: ProjectCard;
  @Input() showOwnerActions: boolean = false;
  @Input() animationDelay: number = 0;
  
  // ✅ YA NO NECESITAMOS OUTPUTS (ProjectCard navega solo)
  // @Output() projectClick = new EventEmitter<ProjectCard>(); // ❌ ELIMINAR
  // @Output() favoriteClick = new EventEmitter<ProjectCard>(); // ❌ ELIMINAR

  private favoritesService = inject(FavoritesService);
  private modalService = inject(ModalService);
  private authService = inject(AuthService);
  private router = inject(Router); // ✅ AGREGAR ROUTER
  isLoadingFavorite = false;

  // ... (código existente de favoritos)

  /**
   * ✅ NUEVO: Maneja el click en la carta - NAVEGA DIRECTAMENTE
   */
  onProjectClick(): void {
    const currentUser = this.authService.getCurrentUser();
    
    // Si es el propietario → vista de vendedor
    if (currentUser && this.project.seller.id === parseInt(currentUser.id)) {
      this.router.navigate(['/vendedor/proyecto', this.project.id]);
    } else {
      // Vista pública
      this.router.navigate(['/proyecto', this.project.id]);
    }
  }

  // onFavoriteClick() → ✅ YA EXISTE Y FUNCIONA PERFECTO
}
```

#### Template actualizado:

```html
<div class="studex-card..." 
     (click)="onProjectClick()">  <!-- ✅ Navega directamente, no emite evento -->
  
  <!-- ... resto del template igual ... -->

  <button (click)="onFavoriteClick($event)">  <!-- ✅ Ya maneja todo -->
    <!-- Corazón -->
  </button>
</div>
```

#### Páginas simplificadas:

```html
<!-- HOME -->
<app-project-card
  *ngFor="let project of featuredProjects; trackBy: trackByProjectId"
  [project]="project"
  [animationDelay]="i * 0.1">
  <!-- ✅ NO MÁS (projectClick) ni (favoriteClick) -->
</app-project-card>
```

```typescript
// HOME.TS - ELIMINAR MÉTODOS:
// ❌ viewProject() → No se usa
// ❌ handleFavoriteClick() → No se usa
```

---

### **OPCIÓN B: Servicio Compartido**

Si prefieres mantener los eventos, crea un servicio:

```typescript
// project-navigation.service.ts
@Injectable({ providedIn: 'root' })
export class ProjectNavigationService {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  /**
   * Navega al detalle del proyecto
   */
  navigateToProject(project: ProjectCard): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser && project.seller.id === parseInt(currentUser.id)) {
      this.router.navigate(['/vendedor/proyecto', project.id]);
    } else {
      this.router.navigate(['/proyecto', project.id]);
    }
  }

  /**
   * Maneja click en favorito (solo para casos especiales)
   */
  handleFavoriteToggle(project: ProjectCard): void {
    // El ProjectCardComponent ya maneja todo
    console.log('Favorito toggled:', project.id);
  }
}
```

**Uso en páginas:**

```typescript
// home.ts
export class Home {
  constructor(private projectNav: ProjectNavigationService) {}

  viewProject(project: ProjectCard): void {
    this.projectNav.navigateToProject(project);
  }
}
```

**Pero esto sigue siendo innecesario** si ProjectCard maneja todo.

---

## 🎯 REFACTORIZACIÓN DE SELLER-PROJECTS

**Seller Projects debe usar `ProjectCardComponent`:**

```html
<!-- seller-projects.ts template -->
<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
  <app-project-card
    *ngFor="let project of projects"
    [project]="transformToProjectCard(project)"
    [showOwnerActions]="true"
    [animationDelay]="0">
  </app-project-card>
</div>
```

```typescript
// seller-projects.ts
transformToProjectCard(project: SellerProject): ProjectCard {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    price: project.price,
    type: project.type,
    university: project.university,
    category: project.subject,
    year: project.year,
    rating: 0,
    views: project.views,
    downloads: project.downloads,
    mainImage: project.mainImage,
    isFavorite: false,
    status: project.status,
    featured: project.featured,
    seller: {
      id: 0,
      name: 'Tú',
      rating: 0,
      salesCount: 0
    }
  };
}
```

**Beneficios:**
- ✅ Elimina 200+ líneas de template duplicado
- ✅ Reutiliza estilos y animaciones
- ✅ Badges de estado funcionan automáticamente con `showOwnerActions`

---

## 📊 COMPARACIÓN

| Aspecto | Estado Actual | Opción A (Recomendada) | Opción B (Servicio) |
|---------|--------------|------------------------|---------------------|
| Líneas de código | ~450 líneas | ~180 líneas (-60%) | ~300 líneas |
| Duplicación | ❌ Alta | ✅ Ninguna | ⚠️ Baja |
| Mantenibilidad | ❌ Difícil | ✅ Fácil | ⚠️ Media |
| Complejidad | ⚠️ Media | ✅ Baja | ⚠️ Media |
| Seller Projects | ❌ Template custom | ✅ Usa ProjectCard | ✅ Usa ProjectCard |

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Refactorizar ProjectCard
1. Inyectar `Router` en ProjectCard
2. Hacer `onProjectClick()` navegar directamente
3. Eliminar `@Output() projectClick`
4. Eliminar `@Output() favoriteClick`

### Fase 2: Actualizar Páginas
1. **Home**: Eliminar `viewProject()` y `handleFavoriteClick()`
2. **Explore**: Eliminar `viewProject()` y `handleFavoriteClick()`
3. **Favorites**: Renombrar `onProjectClick/onFavoriteClick` por consistencia
4. Remover bindings `(projectClick)` y `(favoriteClick)` de templates

### Fase 3: Refactorizar Seller Projects
1. Importar `ProjectCardComponent`
2. Crear método `transformToProjectCard()`
3. Reemplazar template custom por `<app-project-card>`
4. Pasar `[showOwnerActions]="true"`

### Fase 4: Testing
1. Verificar navegación en cada página
2. Probar favoritos (agregar/remover)
3. Validar proyectos propios vs públicos
4. Confirmar badges de estado en Seller Projects

---

## ⚙️ CÓDIGO FINAL PROPUESTO

### 1. `project-card.ts`

```typescript
import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FavoritesService } from '../../services/favorites.service';
import { ModalService } from '../../services/modal.service';
import { AuthService } from '../../services/auth.service';

export interface ProjectCard {
  // ... (interfaz sin cambios)
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
  @Input() showOwnerActions: boolean = false;
  @Input() animationDelay: number = 0;
  
  // ✅ ELIMINADOS: @Output() projectClick y favoriteClick

  private favoritesService = inject(FavoritesService);
  private modalService = inject(ModalService);
  private authService = inject(AuthService);
  private router = inject(Router); // ✅ NUEVO
  isLoadingFavorite = false;

  get isOwner(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser ? this.project.seller.id === parseInt(currentUser.id) : false;
  }

  get shouldShowOwnerActions(): boolean {
    return this.showOwnerActions || this.isOwner;
  }

  ngOnInit() {
    if (this.project) {
      this.project.isFavorite = this.favoritesService.isFavorite(this.project.id);
    }
  }

  /**
   * ✅ ACTUALIZADO: Navega directamente sin emitir evento
   */
  onProjectClick(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser && this.project.seller.id === parseInt(currentUser.id)) {
      this.router.navigate(['/vendedor/proyecto', this.project.id]);
    } else {
      this.router.navigate(['/proyecto', this.project.id]);
    }
  }

  /**
   * ✅ SIN CAMBIOS: Ya funciona perfecto
   */
  onFavoriteClick(event: Event): void {
    event.stopPropagation();
    
    if (this.isLoadingFavorite) return;
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.isLoadingFavorite = true;
    
    if (!this.project.isFavorite) {
      this.favoritesService.addToFavorites(this.project.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.project.isFavorite = true;
          }
          this.isLoadingFavorite = false;
        },
        error: (error) => {
          console.error('Error agregando:', error);
          if (error.error?.code === 'OWN_PROJECT') {
            this.showOwnProjectAlert();
          }
          this.isLoadingFavorite = false;
        }
      });
    } else {
      this.favoritesService.removeFromFavorites(this.project.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.project.isFavorite = false;
          }
          this.isLoadingFavorite = false;
        },
        error: (error) => {
          console.error('Error removiendo:', error);
          this.isLoadingFavorite = false;
        }
      });
    }
  }

  private showOwnProjectAlert(): void {
    this.modalService.showModal(
      'No puedes agregar a favoritos',
      'Los favoritos son para guardar proyectos de otros usuarios.'
    );
  }

  onImageError(event: any): void {
    event.target.src = 'https://via.placeholder.com/400x300/e5e7eb/6b7280?text=Sin+Imagen';
  }

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

  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'PUBLISHED': 'success',
      'DRAFT': 'warning',
      'PENDING': 'info',
      'REJECTED': 'danger'
    };
    return statusClasses[status] || 'secondary';
  }

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
```

### 2. `home.html`

```html
<!-- ✅ SIMPLIFICADO -->
<app-project-card
  *ngFor="let project of featuredProjects; trackBy: trackByProjectId; let i = index"
  [project]="project"
  [animationDelay]="i * 0.1"
  class="slide-in-up"
  [style.animation-delay]="(i * 0.1) + 's'">
</app-project-card>
```

### 3. `home.ts`

```typescript
// ✅ ELIMINAR MÉTODOS:
// - viewProject()
// - handleFavoriteClick()
```

### 4. `explore.html` y `explore.ts`

**Igual que Home**: eliminar bindings y métodos duplicados.

### 5. `favorites.component.html`

```html
<!-- ✅ SIMPLIFICADO -->
<app-project-card
  *ngFor="let favorite of favorites; let i = index"
  [project]="transformToProjectCard(favorite)"
  [animationDelay]="i * 0.1"
  class="slide-in-up">
</app-project-card>
```

### 6. `favorites.component.ts`

```typescript
// ✅ ELIMINAR:
// - onProjectClick()
// - onFavoriteClick()

// ✅ MANTENER:
transformToProjectCard(favorite: FavoriteProject): ProjectCard {
  return {
    id: favorite.projectId,
    title: favorite.project.title,
    // ... resto de la transformación
    isFavorite: this.favoritesService.isFavorite(favorite.projectId)
  };
}
```

---

## 📈 MÉTRICAS DE MEJORA

### Código Eliminado
- **Home**: ~30 líneas
- **Explore**: ~30 líneas  
- **Favorites**: ~20 líneas
- **Seller Projects**: ~200 líneas (template custom)
- **Total**: ~280 líneas eliminadas

### Mantenibilidad
- ✅ Un solo lugar para cambiar navegación
- ✅ Un solo lugar para manejar favoritos
- ✅ Consistencia en todas las páginas
- ✅ Seller Projects usa el mismo componente

### Performance
- ✅ Menos event emitters
- ✅ Menos change detection cycles
- ✅ Mejor tree-shaking

---

## ⚠️ RIESGOS Y MITIGACIONES

| Riesgo | Mitigación |
|--------|-----------|
| Breaking changes en otras páginas | Probar cada página después de cambios |
| Router no disponible en ProjectCard | Ya se inyecta con `inject()` |
| Eventos personalizados necesarios en futuro | Agregar `@Output` opcionales cuando sea necesario |

---

## ✅ CONCLUSIÓN

**Recomendación: Implementar OPCIÓN A**

**Razones:**
1. ✅ Elimina 280+ líneas de código duplicado
2. ✅ ProjectCard es completamente autosuficiente
3. ✅ Más fácil de mantener (un solo lugar)
4. ✅ Seller Projects finalmente usa el componente
5. ✅ Código más limpio y profesional

**Siguiente paso:**
¿Quieres que implemente esta refactorización?
