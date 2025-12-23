import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-borrow-book',
  templateUrl: './borrow-book.component.html',
  styleUrls: ['./borrow-book.component.css']
})
export class BorrowBookComponent implements OnInit {
  borrowBooks: any[] = [];
  errorMessage: string = '';

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      this.fetchBorrowBooks(token);
      this.handleQueryParams();
    } else {
      this.errorMessage = 'Vui lòng đăng nhập để xem danh sách.';
    }
  }

  handleQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      const bookId = params['bookId'];
      if (bookId) {
        this.scrollToBook(bookId);
      }
    });
  }

  fetchBorrowBooks(token: string): void {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get('/api/user/find-borrowBook-by-user', { headers }).subscribe({
      next: (response: any) => {
        this.borrowBooks = response.sort((a: any, b: any) => {
          const isReturnedA = !!a.returned; 
          const isReturnedB = !!b.returned;
          
          if (isReturnedA === isReturnedB) {
            return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
          }
          return (isReturnedA ? 1 : 0) - (isReturnedB ? 1 : 0);
        });
      },
      error: (error) => {
        this.errorMessage = error.error?.errorMessage || 'Không thể tải dữ liệu.';
        console.error('Error fetching borrow books:', error);
      }
    });
  }

  scrollToBook(bookId: number): void {
    setTimeout(() => {
      const bookElement = document.getElementById(`book-${bookId}`);
      if (bookElement) {
        bookElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        bookElement.classList.add('highlight');
        setTimeout(() => bookElement.classList.remove('highlight'), 2000);
      }
    }, 500);
  }

  getStatusText(returned: boolean): string {
    return returned ? 'Đã trả' : 'Đang mượn';
  }

  getStatusClass(returned: boolean): string {
    return returned ? 'status-returned' : 'status-borrowing';
  }
}