import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-borrow',
  templateUrl: './borrow.component.html',
  styleUrls: ['./borrow.component.css']
})
export class BorrowComponent {
  activeTab: string = 'lend'; 


  searchBookParam: string = '';
  booksSearchList: any[] = [];
  selectedBook: any = null;
  searchBookTimeout: any;

  searchUserLendParam: string = '';
  usersSearchLendList: any[] = [];
  selectedUserLend: any = null;
  searchUserLendTimeout: any;

  isSubmitting: boolean = false;

  searchUserReturnParam: string = '';
  usersReturnList: any[] = [];
  selectedUserReturnId: string | null = null;
  selectedUserReturnName: string = '';
  borrowBooks: any[] = [];
  
  isConfirmationVisible: boolean = false;
  isSuccessMessageVisible: boolean = false;
  bookIdToReturn: number | null = null;
  bookNameToReturn: string = '';

  constructor(private http: HttpClient) {}

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  onSearchBook() {
    clearTimeout(this.searchBookTimeout);
    if (!this.searchBookParam.trim()) {
      this.booksSearchList = [];
      return;
    }
    
    this.searchBookTimeout = setTimeout(() => {
       const token = localStorage.getItem('authToken');
       const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
       
       this.http.post(`${environment.apiUrl}/system/search-book`, { param: this.searchBookParam }, { headers })
        .subscribe((res: any) => {
          this.booksSearchList = res || [];
        }, error => {
          console.error('Lỗi tìm sách:', error);
        });
    }, 300);
  }

  selectBook(book: any) {
    this.selectedBook = book;
    this.searchBookParam = '';
    this.booksSearchList = [];
  }

  clearSelectedBook() {
    this.selectedBook = null;
  }

  onSearchUserLend() {
    clearTimeout(this.searchUserLendTimeout);
    if (!this.searchUserLendParam.trim()) {
      this.usersSearchLendList = [];
      return;
    }

    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

    this.searchUserLendTimeout = setTimeout(() => {
      this.http.post(`${environment.apiUrl}/system/search-user`, { param: this.searchUserLendParam }, { headers })
        .subscribe(
          (res: any) => this.usersSearchLendList = res || [],
          error => console.error(error)
        );
    }, 300);
  }

  selectUserLend(user: any) {
    this.selectedUserLend = user;
    this.searchUserLendParam = '';
    this.usersSearchLendList = [];
  }

  clearSelectedUserLend() {
    this.selectedUserLend = null;
  }

  submitBorrow() {
    if (!this.selectedBook || !this.selectedUserLend || this.selectedBook.quantity <= 0) return;

    this.isSubmitting = true;
    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

    const payload = {
      user: { id: this.selectedUserLend.id },
      book: { id: this.selectedBook.id }
    };

    this.http.post(`${environment.apiUrl}/system/add-borrowBook`, payload, { headers })
      .subscribe(
        () => {
          this.isSubmitting = false;
          alert(`Thành công! Đã cho người dùng ${this.selectedUserLend.fullname} mượn sách ${this.selectedBook.name}`);
          this.clearSelectedBook();
          this.clearSelectedUserLend();
        },
        (error) => {
          this.isSubmitting = false;
          console.error(error);
          alert(error.error?.message || 'Có lỗi xảy ra, người dùng có thể đã mượn sách này hoặc kho đã hết!');
        }
      );
  }

  openQRScanner() {
    alert("Kích hoạt Module quét QR Code!");
  }


  onSearchUserReturn() {
    if (!this.searchUserReturnParam.trim()) {
      this.usersReturnList = [];
      return;
    }

    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

    this.http.post(`${environment.apiUrl}/system/search-user`, { param: this.searchUserReturnParam }, { headers })
      .subscribe(
        (response: any) => this.usersReturnList = response || [],
        (error) => {
          console.error('Error searching users:', error);
          alert('Lỗi khi tìm kiếm người dùng!');
        }
      );
  }

  selectUserReturn(user: any) {
    this.selectedUserReturnId = user.id;
    this.selectedUserReturnName = `${user.fullname} - ${user.idCard} - ${user.phone}`;
    this.usersReturnList = []; 
    this.searchUserReturnParam = '';
    this.fetchBorrowBooks(); 
  }

  clearSelectedUserReturn() {
    this.selectedUserReturnId = null;
    this.selectedUserReturnName = '';
    this.borrowBooks = [];
  }

  fetchBorrowBooks() {
    if (!this.selectedUserReturnId) return;

    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get(`${environment.apiUrl}/system/find-borrowBook?userId=${this.selectedUserReturnId}`, { headers })
      .subscribe(
        (response: any) => this.borrowBooks = response || [],
        (error) => {
          console.error('Error fetching borrow books:', error);
          alert('Lỗi khi tìm kiếm thông tin mượn sách!');
        }
      );
  }

  openConfirmationDialog(bookId: number, bookName: string) {
    this.bookIdToReturn = bookId;
    this.bookNameToReturn = bookName;
    this.isConfirmationVisible = true;
  }

  closeConfirmationDialog() {
    this.isConfirmationVisible = false;
    this.bookIdToReturn = null;
    this.bookNameToReturn = '';
  }

  confirmReturnBook() {
    if (this.bookIdToReturn) {
      const token = localStorage.getItem('authToken');
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

      this.http.post(`${environment.apiUrl}/system/return-book?borrowBookId=${this.bookIdToReturn}`, {}, { headers, responseType: 'text' })
        .subscribe(
          () => {
            this.isSuccessMessageVisible = true;
            setTimeout(() => (this.isSuccessMessageVisible = false), 3000);
            this.fetchBorrowBooks(); 
            this.closeConfirmationDialog();
          },
          (error) => {
            console.error('Error returning book:', error);
            alert('Không thể trả sách. Vui lòng thử lại sau!');
          }
        );
    }
  }
}