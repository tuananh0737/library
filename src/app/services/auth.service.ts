import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs'; // Import BehaviorSubject

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrlLogin = 'http://localhost:8081/api/login';
  private apiUrlRegis = 'http://localhost:8081/api/regis';  
  private apiUrlBookmark = 'http://localhost:8081/api/user/find-bookmark-by-user';

  // BehaviorSubject để lưu trạng thái userRole hiện tại. Mặc định là chuỗi rỗng.
  private userRoleSubject = new BehaviorSubject<string>('');
  // Observable để các component khác (như AppComponent) có thể subscribe lắng nghe thay đổi
  userRole$ = this.userRoleSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Hàm này dùng để cập nhật role (gọi khi login thành công hoặc load trang)
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
    return this.http.post(this.apiUrlBookmark, { headers });
  }
}