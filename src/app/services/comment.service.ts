import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrlUserComments = '/api/user/comments'; 
  private apiUrlAdd = '/api/user/add-comment';
  private apiUrlDelete = '/api/user/delete-comment';
  
  // Endpoint Admin mới
  private apiUrlAdminDelete = '/api/admin/delete-comment'; 
  
  private apiUrlGetByBook = '/api/public/find-comment-book'; 

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

  // Xóa comment của chính mình (User thường)
  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrlDelete}?id=${commentId}`, { headers: this.getHeaders() });
  }

  // [MỚI] Xóa comment bất kỳ (Quyền Admin)
  deleteCommentByAdmin(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrlAdminDelete}?id=${commentId}`, { headers: this.getHeaders() });
  }
}