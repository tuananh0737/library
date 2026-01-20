import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-borrow',
  templateUrl: './borrow.component.html',
  styleUrls: ['./borrow.component.css']
})
export class BorrowComponent {
  searchParam: string = '';
  users: any[] = [];
  selectedUserId: string | null = null;
  selectedUserName: string = '';
  borrowBooks: any[] = [];
  isUserSelectorVisible: boolean = false;
  isConfirmationVisible: boolean = false;
  isSuccessMessageVisible: boolean = false;
  bookIdToReturn: number | null = null;
  bookNameToReturn: string = '';

  constructor(private http: HttpClient) {}

  openUserSelector() {
    this.isUserSelectorVisible = true;
  }

  closeUserSelector() {
    this.isUserSelectorVisible = false;
  }

  searchUsers() {
    if (!this.searchParam.trim()) {
      this.users = [];
      return;
    }

    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.post(`${environment.apiUrl}/system/search-user`, { param: this.searchParam }, { headers })
      .subscribe(
        (response: any) => {
          this.users = response || [];
        },
        (error) => {
          console.error('Error searching users:', error);
          alert('Lỗi khi tìm kiếm người dùng!');
        }
      );
  }

  selectUser(user: any) {
    this.selectedUserId = user.id;
    this.selectedUserName = `${user.fullname} - ${user.idCard} - ${user.phone}`;
    this.closeUserSelector();
  }

  fetchBorrowBooks() {
    if (!this.selectedUserId) return;

    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get(`${environment.apiUrl}/system/find-borrowBook?userId=${this.selectedUserId}`, { headers })
      .subscribe(
        (response: any) => {
          this.borrowBooks = response || [];
        },
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
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

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
