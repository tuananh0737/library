import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class BookService {
  private apiUrl = `${environment.apiUrl}/public/find-all-book`;

  constructor(private http: HttpClient) { }

  getBooks(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
