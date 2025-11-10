import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Interfaz para el autor de un comentario
 */
export interface CommentAuthor {
  id: number;
  nombre: string;
  apellidos: string | null;
  profileImage: string | null;
  vendedorVerificado: boolean;
  institucion: string | null;
}

/**
 * Interfaz para un comentario de proyecto
 */
export interface ProjectComment {
  id: number;
  contenido: string;
  proyectoId: number;
  usuarioId: number;
  fechaCreacion: string;
  fechaActualizacion: string;
  usuario: CommentAuthor;
}

/**
 * Interfaz para la respuesta del API
 */
export interface CommentResponse {
  success: boolean;
  data?: ProjectComment | ProjectComment[];
  message?: string;
}

/**
 * Servicio para gestionar comentarios de proyectos
 */
@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = `${environment.apiUrl}/comments`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los headers HTTP con el token de autenticación
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('studex_token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Obtiene todos los comentarios de un proyecto
   */
  getComments(projectId: number): Observable<CommentResponse> {
    return this.http.get<CommentResponse>(`${this.apiUrl}/${projectId}`);
  }

  /**
   * Crea un nuevo comentario
   */
  createComment(projectId: number, content: string): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(
      this.apiUrl, 
      { projectId, content },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Elimina un comentario
   */
  deleteComment(commentId: number): Observable<CommentResponse> {
    return this.http.delete<CommentResponse>(
      `${this.apiUrl}/${commentId}`,
      { headers: this.getHeaders() }
    );
  }
}
