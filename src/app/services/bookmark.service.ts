import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookmarkService {
  // Sử dụng các endpoint giống hệt bên Connect
  private apiUrlAdd = '/api/user/add-bookmark';
  private apiUrlGet = '/api/user/find-bookmark-by-user';
  private apiUrlDelete = '/api/user/delete-bookmark';

  constructor(private http: HttpClient) { }

  // Helper để lấy header có token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Lấy danh sách bookmark (Logic từ MybookComponent của Connect)
  getBookmarks(): Observable<any> {
    return this.http.get(this.apiUrlGet, { headers: this.getHeaders() });
  }

  // Thêm bookmark (Logic từ BookListComponent của Connect)
  addBookmark(bookId: number): Observable<any> {
    const body = { book: { id: bookId } }; // Cấu trúc body giữ nguyên
    return this.http.post(this.apiUrlAdd, body, { headers: this.getHeaders() });
  }

  // Xóa bookmark (Logic từ MybookComponent của Connect)
  deleteBookmark(bookmarkId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrlDelete}?id=${bookmarkId}`, { headers: this.getHeaders() });
  }
}