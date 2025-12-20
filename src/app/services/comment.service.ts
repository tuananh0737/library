import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrlGet = '/api/user/comments'; 
  private apiUrlAdd = '/api/user/add-comment';
  private apiUrlDelete = '/api/user/delete-comment';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getComments(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrlGet);
  }

  // Logic thêm comment được trích xuất từ BookListComponent của Connect
  addComment(content: string, star: number, bookId: number): Observable<any> {
    const body = {
      content: content,
      star: star,
      book: { id: bookId },
    };
    return this.http.post(this.apiUrlAdd, body, { headers: this.getHeaders() });
  }

  deleteComment(commentId: number): Observable<void> {
    // API delete yêu cầu Authorization header nếu backend yêu cầu bảo mật
    return this.http.delete<void>(`${this.apiUrlDelete}?id=${commentId}`, { headers: this.getHeaders() });
  }
}