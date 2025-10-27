import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-50 overflow-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
         (click)="onBackdropClick($event)">
      
      <!-- Modal Container -->
      <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 modern-card overflow-hidden transform transition-all duration-500 animate-modal-appear"
           (click)="$event.stopPropagation()">
        
        <!-- Decorative Top Bar -->
        <div class="h-2 bg-studex-gradient"></div>
        
        <!-- Header -->
        <div class="relative bg-gradient-to-br from-studex-50 to-white p-6 text-center">
          <!-- Icon -->
          <div class="w-16 h-16 mx-auto mb-4 bg-studex-600 rounded-full flex items-center justify-center shadow-lg">
            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          
          <!-- Title -->
          <h3 class="text-xl font-bold text-studex-900 mb-3">{{ title }}</h3>
          <div class="w-12 h-1 bg-studex-600 rounded-full mx-auto"></div>
        </div>
        
        <!-- Content -->
        <div class="p-6 bg-white">
          <!-- Message -->
          <p class="text-studex-600 text-center leading-relaxed font-medium mb-6">
            {{ message }}
          </p>
          
          <!-- Decorative dots -->
          <div class="flex justify-center mb-6">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-studex-300 rounded-full"></div>
              <div class="w-2 h-2 bg-studex-400 rounded-full"></div>
              <div class="w-2 h-2 bg-studex-500 rounded-full"></div>
            </div>
          </div>
          
          <!-- Action Button -->
          <div class="flex justify-center">
            <button (click)="close()" 
                    class="group relative px-8 py-3 bg-studex-600 hover:bg-studex-700 text-white font-bold rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 modern-button">
              <!-- Button Content -->
              <div class="flex items-center space-x-2">
                <span class="text-white">Entendido</span>
                <svg class="w-4 h-4 text-white transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modern-card {
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.25),
        0 0 0 1px rgba(255, 255, 255, 0.05);
    }
    
    .modern-button {
      box-shadow: 
        0 8px 20px rgba(0, 0, 0, 0.15),
        0 4px 10px rgba(99, 102, 241, 0.3);
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    }
    
    .modern-button:hover {
      box-shadow: 
        0 12px 30px rgba(0, 0, 0, 0.2),
        0 6px 15px rgba(99, 102, 241, 0.4);
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes modal-appear {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }

    .animate-modal-appear {
      animation: modal-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  `]
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() message = '';
  @Output() closeModal = new EventEmitter<void>();

  close(): void {
    this.isOpen = false;
    this.closeModal.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}