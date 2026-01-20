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
  
    constructor(private http: HttpClient) {}
  
  
    ngOnInit(): void {
      this.loadUsers();
    }
  
    showDeleteConfirm: boolean = false;
    userToDeleteId: number | null = null;
  
    openEditUserForm(user: User): void {
      this.selectedUser = { ...user };
      this.showEditForm = true;
    }
    
    errorMessage: string | null = null; 
  
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
          this.closeEditForm();
          alert('Cập nhật người dùng thành công!');
          window.location.reload();
        },
        error: (err) => {
          if (err.error) {
            this.errorMessage = err.error; 
          } else {
            this.errorMessage = 'Đã xảy ra lỗi khi cập nhật người dùng.';
          }
        },
      });
    }
    
    closeEditForm(): void {
      this.showEditForm = false;
      this.selectedUser = null;
      this.errorMessage = null;
    }
  
    //searchUser
    param: string = '';
  
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
            alert('Không tìm thấy người dùng nào phù hợp.');
          }
        },
        error: (err) => {
          console.error('Lỗi khi tìm kiếm người dùng:', err);
          alert('Không thể tìm kiếm người dùng.');
        },
      });
    }
  
    // phân trang
    currentPage: number = 1; 
    pageSize: number = 10; 
    paginatedUsers: User[] = []; 
    totalPages: number = 1; 
  
    // Lấy toàn bộ dữ liệu và thiết lập phân trang
    loadUsers(): void {
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };
      const url = `${environment.apiUrl}/admin/getUserByRole?role=ROLE_LIBRARIAN`;
  
      this.http.get<User[]>(url, { headers }).subscribe({
        next: (data) => {
          this.users = data;
          this.totalPages = Math.ceil(this.users.length / this.pageSize); 
          this.updatePagination();
        },
        error: (err) => {
          console.error('Lỗi khi gọi API:', err);
        },
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
  
  }
  

