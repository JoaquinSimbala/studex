import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalData {
  title: string;
  message: string;
  isOpen: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new BehaviorSubject<ModalData>({
    title: '',
    message: '',
    isOpen: false
  });

  modal$ = this.modalSubject.asObservable();

  /**
   * Muestra un modal con título y mensaje
   */
  showModal(title: string, message: string): void {
    this.modalSubject.next({
      title,
      message,
      isOpen: true
    });
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.modalSubject.next({
      title: '',
      message: '',
      isOpen: false
    });
  }
}