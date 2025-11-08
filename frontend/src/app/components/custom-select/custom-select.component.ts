import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Opción para el select personalizado
 */
export interface SelectOption {
  value: string | number;
  label: string;
  icon?: string;
}

/**
 * Componente de Select personalizado con diseño mejorado
 * 
 * @description
 * Reemplaza el select nativo de HTML con un dropdown personalizado
 * que permite mayor control sobre el diseño y la experiencia de usuario.
 */
@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-select.component.html',
  styleUrls: ['./custom-select.component.scss']
})
export class CustomSelectComponent {
  @Input() options: SelectOption[] = [];
  @Input() value: string | number = '';
  @Input() placeholder: string = 'Seleccionar...';
  @Input() disabled: boolean = false;
  @Output() valueChange = new EventEmitter<string | number>();

  isOpen = false;

  constructor(private elementRef: ElementRef) {}

  /**
   * Obtiene el label de la opción seleccionada
   */
  getSelectedLabel(): string {
    const selected = this.options.find(opt => opt.value === this.value);
    return selected ? selected.label : this.placeholder;
  }

  /**
   * Alterna el estado del dropdown
   */
  toggleDropdown(): void {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
    }
  }

  /**
   * Selecciona una opción
   */
  selectOption(option: SelectOption): void {
    this.value = option.value;
    this.valueChange.emit(option.value);
    this.isOpen = false;
  }

  /**
   * Cierra el dropdown al hacer clic fuera
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
