import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseService, PurchaseRequest } from '../../services/purchase.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';

export interface ProjectSummary {
  id: number;
  title: string;
  price: number;
  seller: {
    name: string;
    avatar?: string;
  };
  mainImage?: {
    fileUrl: string;
  };
}

@Component({
  selector: 'app-purchase-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
           (click)="onClose()"></div>
      
      <!-- Modal -->
      <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl transform transition-all">
          
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-gray-900">Confirmar Compra</h3>
              <button (click)="onClose()" 
                      class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="px-6 py-6">
            
            <!-- Project Summary -->
            <div class="bg-gray-50 rounded-xl p-4 mb-6">
              <div class="flex items-start space-x-4">
                <img [src]="project?.mainImage?.fileUrl || 'https://via.placeholder.com/100x75/e5e7eb/6b7280?text=Sin+Imagen'" 
                     [alt]="project?.title"
                     class="w-20 h-15 rounded-lg object-cover">
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-900 text-lg">{{ project?.title }}</h4>
                  <p class="text-gray-600 text-sm mb-2">por {{ project?.seller?.name }}</p>
                  <div class="flex items-center justify-between">
                    <span class="text-2xl font-bold text-studex-600">S/ {{ project?.price }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Method Selection -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-3">
                Método de Pago
              </label>
              <div class="space-y-3">
                <div class="flex items-center">
                  <input type="radio" 
                         id="yape" 
                         name="paymentMethod" 
                         value="YAPE"
                         [(ngModel)]="selectedPaymentMethod"
                         class="h-4 w-4 text-studex-600 focus:ring-studex-500 border-gray-300">
                  <label for="yape" class="ml-3 flex items-center">
                    <span class="text-purple-600 font-bold text-lg mr-2">Y</span>
                    <span class="text-sm font-medium text-gray-900">Yape</span>
                  </label>
                </div>
                
                <div class="flex items-center">
                  <input type="radio" 
                         id="plin" 
                         name="paymentMethod" 
                         value="PLIN"
                         [(ngModel)]="selectedPaymentMethod"
                         class="h-4 w-4 text-studex-600 focus:ring-studex-500 border-gray-300">
                  <label for="plin" class="ml-3 flex items-center">
                    <span class="text-blue-600 font-bold text-lg mr-2">P</span>
                    <span class="text-sm font-medium text-gray-900">Plin</span>
                  </label>
                </div>
                
                <div class="flex items-center">
                  <input type="radio" 
                         id="bancario" 
                         name="paymentMethod" 
                         value="BANCARIO"
                         [(ngModel)]="selectedPaymentMethod"
                         class="h-4 w-4 text-studex-600 focus:ring-studex-500 border-gray-300">
                  <label for="bancario" class="ml-3 flex items-center">
                    <span class="text-green-600 font-bold text-lg mr-2">🏦</span>
                    <span class="text-sm font-medium text-gray-900">Transferencia Bancaria</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Simulation Notice -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div class="flex">
                <svg class="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                </svg>
                <div class="ml-3">
                  <h4 class="text-sm font-medium text-blue-800">
                    Compra Simulada
                  </h4>
                  <p class="text-sm text-blue-700 mt-1">
                    Esta es una compra simulada para demostración. El acceso a los archivos se activará automáticamente.
                  </p>
                </div>
              </div>
            </div>

            <!-- Terms and Conditions -->
            <div class="flex items-start space-x-3 mb-6">
              <input type="checkbox" 
                     id="terms" 
                     [(ngModel)]="acceptedTerms"
                     class="h-4 w-4 text-studex-600 focus:ring-studex-500 border-gray-300 rounded">
              <label for="terms" class="text-sm text-gray-600">
                Acepto los 
                <a href="#" class="text-studex-600 hover:text-studex-700 underline">términos y condiciones</a> 
                y las 
                <a href="#" class="text-studex-600 hover:text-studex-700 underline">políticas de privacidad</a>
              </label>
            </div>

            <!-- Summary -->
            <div class="border-t border-gray-200 pt-4">
              <div class="flex justify-between text-lg font-semibold">
                <span>Total a pagar:</span>
                <span class="text-studex-600">S/ {{ project?.price }}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-gray-50 rounded-b-2xl flex space-x-3">
            <button (click)="onClose()" 
                    type="button"
                    class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-studex-500 transition-colors">
              Cancelar
            </button>
            <button (click)="onConfirmPurchase()" 
                    type="button"
                    [disabled]="!canProceed() || isProcessing"
                    [class]="canProceed() && !isProcessing ? 
                      'flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-studex-600 to-studex-700 rounded-lg hover:from-studex-700 hover:to-studex-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-studex-500 transition-all transform hover:scale-105' :
                      'flex-1 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-300 rounded-lg cursor-not-allowed'">
              <span *ngIf="!isProcessing" class="flex items-center justify-center">
                💳 Confirmar Compra
              </span>
              <span *ngIf="isProcessing" class="flex items-center justify-center">
                <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class PurchaseModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() project: ProjectSummary | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() purchaseCompleted = new EventEmitter<void>();

  selectedPaymentMethod = 'YAPE';
  acceptedTerms = false;
  isProcessing = false;

  constructor(
    private purchaseService: PurchaseService,
    private notificationService: NotificationService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    // Reset form when modal opens
    if (this.isOpen) {
      this.resetForm();
    }
  }

  onClose(): void {
    if (!this.isProcessing) {
      this.closed.emit();
      this.resetForm();
    }
  }

  canProceed(): boolean {
    return this.selectedPaymentMethod !== '' && this.acceptedTerms && this.project !== null;
  }

  async onConfirmPurchase(): Promise<void> {
    if (!this.canProceed() || !this.project || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const purchaseRequest: PurchaseRequest = {
        projectId: this.project.id,
        paymentMethod: this.selectedPaymentMethod as 'YAPE' | 'PLIN' | 'BANCARIO',
        amount: this.project.price,
        currency: 'PEN'
      };

      const result = await this.purchaseService.purchaseProject(purchaseRequest);

      if (result.success) {
        // Emitir evento ANTES de mostrar la notificación y cerrar
        this.purchaseCompleted.emit();
        
        // Cerrar modal inmediatamente
        this.onClose();
        
        // Mostrar notificación después de cerrar
        setTimeout(() => {
          this.notificationService.showSuccess(
            '¡Compra realizada con éxito! El contenido se ha desbloqueado.',
            'Compra Completada'
          );
        }, 100);
        
      } else {
        this.notificationService.showError(
          result.error || 'Error procesando la compra',
          'Error en Compra'
        );
      }
    } catch (error: any) {
      this.logger.error('Error en compra', error);
      this.notificationService.showError(
        'Error procesando la compra. Inténtalo de nuevo.',
        'Error'
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private resetForm(): void {
    this.selectedPaymentMethod = 'YAPE';
    this.acceptedTerms = false;
    this.isProcessing = false;
  }
}