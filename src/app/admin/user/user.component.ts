import { HttpClient, HttpHeaders } from '@angular/common/http';
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

interface BorrowedBook {
  bookName: string;
  authorName: string;
  genre: string;
  publishYear: number;
  borrowedDate: string;
  returnDueDate: string;     // Hạn trả
  actualReturnDate: string;  // Ngày trả thực tế
  returned: boolean;         // Trạng thái đã trả
}

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  showEditForm: boolean = false;
  
  param: string = '';
  errorMessage: string | null = null; 
  actionSuccessMessage: string = ''; 

  borrowedBooks: BorrowedBook[] = []; 
  showModal: boolean = false;
  
  sendNotification: boolean = false;
  notificationContent: string = '';

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
    const url = `${environment.apiUrl}/admin/getUserByRole?role=ROLE_USER`;

    this.http.get<User[]>(url, { headers }).subscribe({
      next: (data) => {
        this.users = data;
        this.totalPages = Math.ceil(this.users.length / this.pageSize) || 1; 
        this.updatePagination();
      },
      error: (err) => {
        console.error('Lỗi khi gọi API:', err);
      },
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
      error: (err) => {
        console.error('Lỗi khi tìm kiếm người dùng:', err);
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

  showBorrowBook(userId: number): void {
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };
    const url = `${environment.apiUrl}/system/find-borrowBook?userId=${userId}`;

    this.http.get<any[]>(url, { headers }).subscribe({
      next: (data) => {
        this.borrowedBooks = data.map(item => ({
          bookName: item.book.name,
          authorName: item.book.author?.fullname || 'Không rõ',
          genre: item.book.genres?.name || '---',       
          publishYear: item.book.publishYear,
          borrowedDate: item.createdDate,
          returnDueDate: item.returnDueDate,       
          actualReturnDate: item.actualReturnDate, 
          returned: item.returned                  
        }));
        this.showModal = true; 
      },
      error: (err) => {
        console.error('Lỗi khi lấy sách đã mượn:', err);
        alert('Không thể lấy danh sách sách đã mượn.');
      }
    });
  }

  closeModal(): void {
    this.showModal = false; 
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
        this.actionSuccessMessage = 'Cập nhật thông tin người dùng thành công!';
      },
      error: (err) => {
        this.errorMessage = err.error ? err.error : 'Đã xảy ra lỗi khi cập nhật người dùng.';
      },
    });
  }
  
  closeEditForm(): void {
    this.showEditForm = false;
    this.selectedUser = null;
    this.errorMessage = null;
  }

  openSendNotificationForm(user: User): void {
    this.selectedUser = { ...user };
    this.sendNotification = true;
  }

  sendNotificationToUser(): void {
    if (!this.selectedUser) return;
  
    const token = localStorage.getItem('authToken');
    if (!token) return;
  
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const url = `${environment.apiUrl}/admin/send-notification?userId=${this.selectedUser.id}&content=${encodeURIComponent(this.notificationContent)}`;
  
    this.http.post(url, {}, { headers, responseType: 'text' }).subscribe({
      next: (response: string) => {
        this.closeOverlay();
        this.actionSuccessMessage = 'Đã gửi thông báo thành công!';
      },
      error: (err) => {
        console.error('Lỗi khi gửi thông báo:', err);
        alert('Không thể gửi thông báo. Vui lòng thử lại.');
      },
    });
  }

  closeOverlay(): void {
    this.sendNotification = false;
    this.notificationContent = '';
    this.selectedUser = null;
  }

  closeSuccessModal(): void {
    this.actionSuccessMessage = '';
  }
}