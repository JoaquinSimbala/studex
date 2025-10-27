import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { ModalComponent } from './components/modal/modal.component';
import { ModalService, ModalData } from './services/modal.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationsComponent, ModalComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
  modal$: Observable<ModalData>;

  constructor(private modalService: ModalService) {
    this.modal$ = this.modalService.modal$;
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }
}
