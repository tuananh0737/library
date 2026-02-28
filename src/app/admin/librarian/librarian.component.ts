import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';

interface User {
  id: number;
  username: string;
  fullname: string;
  actived: boolean;
  phone: string;
  borrowBook: string;
  idCard: string;
  role: string;
}

@Component({
  selector: 'app-librarian',
  templateUrl: './librarian.component.html',
  styleUrls: ['./librarian.component.css']
})
export class LibrarianComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  showEditForm: boolean = false;
  
  param: string = '';
  errorMessage: string | null = null; 
  actionSuccessMessage: string = '';

  currentPage: number = 1; 
  pageSize: number = 10; 
  paginatedUsers: User[] = []; 
  totalPages: number = 1; 

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };
    const url = `${environment.apiUrl}/admin/getUserByRole?role=ROLE_LIBRARIAN`;

    this.http.get<User[]>(url, { headers }).subscribe({
      next: (data) => {
        this.users = data;
        this.totalPages = Math.ceil(this.users.length / this.pageSize) || 1; 
        this.updatePagination();
      },
      error: (err) => console.error('Lỗi khi gọi API:', err)
    });
  }

  searchUser(): void {
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };
    const url = `${environment.apiUrl}/system/search-user`;
  
    const payload = { param: this.param }; 
  
    this.http.post<User[]>(url, payload, { headers }).subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.users = data;
        } else if (data) {
          this.users = [data]; 
        } else {
          this.users = [];
        }
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.users.length / this.pageSize) || 1;
        this.updatePagination();
      },
      error: (err) => console.error('Lỗi khi tìm kiếm người dùng:', err)
    });
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = this.users.slice(startIndex, endIndex); 
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return; 
    this.currentPage = page;
    this.updatePagination();
  }

  openEditUserForm(user: User): void {
    this.selectedUser = { ...user };
    this.showEditForm = true;
  }
  
  saveUser(): void {
    if (!this.selectedUser) return;
  
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.errorMessage = 'Bạn chưa đăng nhập!';
      return;
    }
  
    const headers = { Authorization: `Bearer ${token}` };
    const url = `${environment.apiUrl}/system/update-user`;
  
    this.http.post<User>(url, this.selectedUser, { headers }).subscribe({
      next: (data) => {
        const index = this.users.findIndex((u) => u.id === this.selectedUser?.id);
        if (index !== -1) {
          this.users[index] = data; 
        }
        this.updatePagination();
        this.closeEditForm();
        this.actionSuccessMessage = 'Cập nhật tài khoản Thủ thư thành công!';
      },
      error: (err) => {
        this.errorMessage = err.error ? err.error : 'Đã xảy ra lỗi khi cập nhật tài khoản.';
      }
    });
  }
  
  closeEditForm(): void {
    this.showEditForm = false;
    this.selectedUser = null;
    this.errorMessage = null;
  }

  closeSuccessModal(): void {
    this.actionSuccessMessage = '';
  }
}