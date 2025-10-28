import { Component } from '@angular/core';
import { Location } from '@angular/common';

/**
 * Componente de botón de retroceso.
 * 
 * @description
 * Botón reutilizable que permite al usuario navegar hacia atrás
 * en el historial del navegador. Utiliza el servicio Location de Angular
 * para realizar la navegación de manera nativa.
 * 
 * @author Studex Team
 * @version 1.0.0
 * 
 * @example
 * ```html
 * <!-- Uso básico en cualquier página -->
 * <app-back-button></app-back-button>
 * ```
 * 
 * @example
 * ```typescript
 * // Importar en el componente padre
 * import { BackButtonComponent } from './components/back-button/back-button.component';
 * 
 * @Component({
 *   imports: [BackButtonComponent]
 * })
 * export class MyPageComponent {}
 * ```
 * 
 * @remarks
 * - El botón utiliza el método `location.back()` del navegador
 * - Si no hay historial previo, el comportamiento depende del navegador
 * - Estilo visual: Botón circular con icono de flecha
 * - Colores: studex-600 con hover studex-800
 * - Incluye animaciones de transición suaves
 */
@Component({
  selector: 'app-back-button',
  standalone: true,
  templateUrl: './back-button.component.html',
  styleUrls: ['./back-button.component.scss']
})
export class BackButtonComponent {
  
  /**
   * Constructor del componente.
   * 
   * @param {Location} location - Servicio de Angular para manipular la URL y el historial del navegador
   */
  constructor(private location: Location) {}

  /**
   * Navega hacia atrás en el historial del navegador.
   * 
   * @description
   * Utiliza el servicio Location de Angular para retroceder una página
   * en el historial de navegación. Equivalente a presionar el botón "Atrás"
   * del navegador.
   * 
   * @returns {void}
   * @public
   * 
   * @example
   * ```typescript
   * // Llamado automáticamente desde el template al hacer click
   * <button (click)="goBack()">Volver</button>
   * ```
   * 
   * @remarks
   * - Si el usuario llegó directamente a la página (sin historial previo),
   *   el comportamiento puede variar según el navegador
   * - No requiere conocer la ruta anterior explícitamente
   * - Funciona con cualquier tipo de navegación anterior (rutas internas o externas)
   */
  goBack(): void {
    this.location.back();
  }
}
