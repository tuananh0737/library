import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrlUserComments = `${environment.apiUrl}/user/comments`; 
  private apiUrlAdd = `${environment.apiUrl}/user/add-comment`;
  private apiUrlDelete = `${environment.apiUrl}/user/delete-comment`;
  private apiUrlAdminDelete = `${environment.apiUrl}/admin/delete-comment`; 
  private apiUrlGetByBook = `${environment.apiUrl}/public/find-comment-book`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getComments(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrlUserComments, { headers: this.getHeaders() });
  }

  getCommentsByBook(bookId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrlGetByBook}?bookId=${bookId}`);
  }

  addComment(content: string, star: number, bookId: number): Observable<any> {
    const body = { content, star, book: { id: bookId } };
    return this.http.post(this.apiUrlAdd, body, { headers: this.getHeaders() });
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrlDelete}?id=${commentId}`, { headers: this.getHeaders() });
  }

  deleteCommentByAdmin(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrlAdminDelete}?id=${commentId}`, { headers: this.getHeaders() });
  }
}