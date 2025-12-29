import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs'; 
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
private apiUrlLogin = '${environment.apiUrl}/api/login';
private apiUrlRegis = '${environment.apiUrl}/api/regis';  
private apiUrlBookmark = '${environment.apiUrl}/api/user/find-bookmark-by-user';

  private userRoleSubject = new BehaviorSubject<string>('');
  userRole$ = this.userRoleSubject.asObservable();

  constructor(private http: HttpClient) {}

  setUserRole(role: string) {
    this.userRoleSubject.next(role);
  }

  login(username: string, password: string): Observable<string> {
    const body = { username, password };
    return this.http.post(this.apiUrlLogin, body, {
      headers: new HttpHeaders({'Content-Type': 'application/json'}),
      responseType: 'text' 
    });
  }

  getErrors(): Observable<any> {
    return this.http.get<any>(this.apiUrlLogin);
  }

  signUp(username: string, password: string, fullname: string): Observable<any> {
    const body = { username, password, fullname };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(this.apiUrlRegis, body, { headers });
  }

  getUserBookmarks(): Observable<any> {
    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
return this.http.post(this.apiUrlBookmark, {}, { headers });
    }
  }