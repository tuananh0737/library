import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BookmarkService {
  private apiUrlAdd = `${environment.apiUrl}/user/add-bookmark`;
  private apiUrlGet = `${environment.apiUrl}/user/find-bookmark-by-user`;
  private apiUrlDelete = `${environment.apiUrl}/user/delete-bookmark`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getBookmarks(): Observable<any> {
    return this.http.get(this.apiUrlGet, { headers: this.getHeaders() });
  }

  addBookmark(bookId: number): Observable<any> {
    const body = { book: { id: bookId } }; 
    return this.http.post(this.apiUrlAdd, body, { headers: this.getHeaders() });
  }

  deleteBookmark(bookmarkId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrlDelete}?id=${bookmarkId}`, { headers: this.getHeaders() });
  }
}