import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private apiUrl = `${environment.apiUrl}/public/find-all-book`;
  private searchUrl = `${environment.apiUrl}/public/search-book`;

  constructor(private http: HttpClient) { }

  getBooks(page: number, size: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  searchBooks(searchData: any, page: number, size: number): Observable<any> {
    return this.http.post<any>(`${this.searchUrl}?page=${page}&size=${size}`, searchData);
  }
}