import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  onLogin() {
    if (!this.username || !this.password) {
      alert('Please enter both username and password');
      return;
    }

    this.loading = true;

    this.authService.login(this.username, this.password).subscribe({
      next: (token) => {
        this.loading = false;
        if (token) {
          localStorage.setItem('authToken', token);
          this.fetchUserRoleAndRedirect(token);
        } else {
          alert('Login failed');
        }
      },
      error: (error) => {
        this.loading = false; 
        console.log('Error Object:', error.error); 

        try {
          const parsedError = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
          if (parsedError.errorMessage) {
            this.errorMessage = parsedError.errorMessage; 
            console.error('Error Message:', parsedError.errorMessage);
            console.error('Error Code:', parsedError.errorCode);
          } else {
            this.errorMessage = 'An unknown error occurred.';
          }
        } catch (e) {
          this.errorMessage = 'Unable to process the error response.';
          console.error('Error Parsing:', e);
        }
      }
    });
  }

  fetchUserRoleAndRedirect(token: string) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.post(`${environment.apiUrl}/userlogged`, {}, { headers }).subscribe({
      next: (response: any) => {
        const role = response?.role;
        
        this.authService.setUserRole(role);

        if (role === 'ROLE_ADMIN') {
          this.router.navigate(['/admin/admin-home']);
        } else if (role === 'ROLE_USER') {
          this.router.navigate(['/home']);
        } else if (role === 'ROLE_LIBRARIAN') {
          this.router.navigate(['/home']);
        } else {
          alert('Unknown role');
        }
      },
      error: (error) => {
        console.error('Failed to fetch user role:', error);
        alert('Error while determining user role');
      }
    });
  }
}