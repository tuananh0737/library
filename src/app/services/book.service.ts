import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private apiUrl = 'https://ibrary.onrender.com/api/public/find-all-book';

  constructor(private http: HttpClient) { }

  getBooks(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
