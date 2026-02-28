import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-borrow',
  templateUrl: './borrow.component.html',
  styleUrls: ['./borrow.component.css']
})
export class BorrowComponent {
  // Quản lý Tab: 'lend' (Cho mượn) | 'return' (Trả sách)
  activeTab: string = 'lend';

  // ==========================================
  // BIẾN CHO TAB: CHO MƯỢN SÁCH
  // ==========================================
  searchBookParam: string = '';
  booksSearchList: any[] = [];
  selectedBook: any = null;
  searchBookTimeout: any;

  searchUserLendParam: string = '';
  usersSearchLendList: any[] = [];
  selectedUserLend: any = null;
  searchUserLendTimeout: any;

  isSubmittingLend: boolean = false;
  showQRScanner: boolean = false; // Trạng thái bật/tắt Camera

  // ==========================================
  // BIẾN CHO TAB: TRẢ SÁCH
  // ==========================================
  searchUserReturnParam: string = '';
  usersReturnList: any[] = [];
  selectedUserReturn: any = null;
  borrowBooks: any[] = [];
  searchUserReturnTimeout: any;

  isConfirmationVisible: boolean = false;
  bookIdToReturn: number | null = null;
  bookNameToReturn: string = '';

  // Thông báo chung
  actionSuccessMessage: string = '';

  constructor(private http: HttpClient) {}

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  // ==========================================
  // LOGIC: QUÉT MÃ QR TÌM SÁCH
  // ==========================================
  openQRScanner() {
    this.showQRScanner = true;
  }

  closeQRScanner() {
    this.showQRScanner = false;
  }

  onCodeResult(result: string) {
    if (!result) return;
    
    // Tắt camera ngay khi quét thành công
    this.closeQRScanner();
    
    // Gọi API tìm sách bằng mã QR vừa quét được
    const url = `${environment.apiUrl}/public/find-book-by-qr`;
    this.http.post(url, result, { responseType: 'json' }).subscribe({
      next: (book: any) => {
        if (book) {
          this.selectBook(book); // Chọn luôn sách vào giỏ
        } else {
          alert('Không tìm thấy sách tương ứng với mã QR này.');
        }
      },
      error: (err) => {
        console.error('Lỗi khi quét QR:', err);
        alert('Mã QR không hợp lệ hoặc không có trong hệ thống!');
      }
    });
  }

  // ==========================================
  // LOGIC: TÌM KIẾM VÀ CHO MƯỢN SÁCH
  // ==========================================
  onSearchBook() {
    clearTimeout(this.searchBookTimeout);
    if (!this.searchBookParam.trim()) { this.booksSearchList = []; return; }
    
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };

    this.searchBookTimeout = setTimeout(() => {
       this.http.post(`${environment.apiUrl}/system/search-book`, { param: this.searchBookParam }, { headers }).subscribe({
         next: (res: any) => this.booksSearchList = res || [],
         error: (err) => console.error(err)
       });
    }, 300);
  }

  selectBook(book: any) { 
    this.selectedBook = book; 
    this.searchBookParam = ''; 
    this.booksSearchList = []; 
  }
  
  clearSelectedBook() { this.selectedBook = null; }

  onSearchUserLend() {
    clearTimeout(this.searchUserLendTimeout);
    if (!this.searchUserLendParam.trim()) { this.usersSearchLendList = []; return; }
    
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };

    this.searchUserLendTimeout = setTimeout(() => {
      this.http.post(`${environment.apiUrl}/system/search-user`, { param: this.searchUserLendParam }, { headers }).subscribe({
        next: (res: any) => this.usersSearchLendList = res || [],
        error: (err) => console.error(err)
      });
    }, 300);
  }

  selectUserLend(user: any) { 
    this.selectedUserLend = user; 
    this.searchUserLendParam = ''; 
    this.usersSearchLendList = []; 
  }
  
  clearSelectedUserLend() { this.selectedUserLend = null; }

  submitBorrow() {
    if (!this.selectedBook || !this.selectedUserLend || this.selectedBook.quantity <= 0) return;
    
    this.isSubmittingLend = true;
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };
    const payload = { user: { id: this.selectedUserLend.id }, book: { id: this.selectedBook.id } };

    this.http.post(`${environment.apiUrl}/system/add-borrowBook`, payload, { headers }).subscribe({
      next: () => {
        this.isSubmittingLend = false;
        this.actionSuccessMessage = `Đã tạo phiên mượn thành công cuốn "${this.selectedBook.name}" cho ${this.selectedUserLend.fullname}.`;
        this.clearSelectedBook();
        this.clearSelectedUserLend();
      },
      error: (err) => {
        this.isSubmittingLend = false;
        console.error(err);
        alert(err.error?.message || 'Lỗi! Người dùng có thể đã mượn sách này hoặc kho đã hết.');
      }
    });
  }

  // ==========================================
  // LOGIC: TÌM KIẾM VÀ TRẢ SÁCH
  // ==========================================
  onSearchUserReturn() {
    clearTimeout(this.searchUserReturnTimeout);
    if (!this.searchUserReturnParam.trim()) { this.usersReturnList = []; return; }
    
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };

    this.searchUserReturnTimeout = setTimeout(() => {
      this.http.post(`${environment.apiUrl}/system/search-user`, { param: this.searchUserReturnParam }, { headers }).subscribe({
        next: (res: any) => this.usersReturnList = res || [],
        error: (err) => console.error(err)
      });
    }, 300);
  }

  selectUserReturn(user: any) {
    this.selectedUserReturn = user;
    this.usersReturnList = [];
    this.searchUserReturnParam = '';
    this.fetchBorrowBooks(); // Load sách đang mượn ngay lập tức
  }

  clearSelectedUserReturn() {
    this.selectedUserReturn = null;
    this.borrowBooks = [];
  }

  fetchBorrowBooks() {
    if (!this.selectedUserReturn) return;
    
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get(`${environment.apiUrl}/system/find-borrowBook?userId=${this.selectedUserReturn.id}`, { headers }).subscribe({
      next: (res: any) => this.borrowBooks = res || [],
      error: (err) => {
        console.error(err);
        alert('Lỗi lấy thông tin mượn sách!');
      }
    });
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
    if (!this.bookIdToReturn) return;
    
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post(`${environment.apiUrl}/system/return-book?borrowBookId=${this.bookIdToReturn}`, {}, { headers, responseType: 'text' }).subscribe({
      next: () => {
        this.actionSuccessMessage = `Thu hồi sách "${this.bookNameToReturn}" thành công!`;
        this.fetchBorrowBooks(); // Tải lại bảng sách
        this.closeConfirmationDialog();
      },
      error: (err) => {
        console.error(err);
        alert('Không thể trả sách. Vui lòng thử lại sau!');
      }
    });
  }

  closeSuccessModal() {
    this.actionSuccessMessage = '';
  }
}