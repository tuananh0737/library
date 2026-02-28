import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Book {
  id: number;
  name: string;
  image?: string;
  numberPage: number;
  publishYear: number;
  description: string;
  quantity: number;
  author: { id: number; fullname: string; nationality: string; };
  genres: { id: number; name: string; };
  qrCode: string;
  location: { id: number; room: string; shelf: string; };
}

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.css']
})
export class BookComponent implements OnInit {
  books: Book[] = [];
  paginatedBooks: Book[] = []; 
  selectedBook: Book | null = null;
  searchQuery: string = '';
  
  isLoading: boolean = false;
  currentPage: number = 1; 
  itemsPerPage: number = 30; 
  totalPages: number = 1;

  // Variables for Add/Edit/Delete
  updateSuccessful: boolean = false;
  showAddBookForm: boolean = false; 
  showDeleteConfirm: boolean = false;
  deleteSuccessful: boolean = false;
  bookToDeleteId: number | null = null;
  authors: { id: number; fullname: string }[] = [];
  genres: { id: number; name: string }[] = [];

  newBook: Book = {
    id: 0, name: '', image: '', numberPage: 0, publishYear: 0, description: '', quantity: 0,
    author: { id: 0, fullname: '', nationality: '' }, genres: { id: 0, name: '' },
    qrCode: '', location: { id: 0, room: '', shelf: ''}
  };

  // Variables for Borrow Book (Split-Pane Auto-complete)
  showBorrowBook: boolean = false;
  users: any[] = [];
  userSearchQuery: string = '';
  selectedUserId: number | null = null;
  selectedUserObj: any = null;
  searchUserTimeout: any;
  isSubmittingBorrow: boolean = false;

  constructor(private bookService: BookService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAuthorsAndGenres();
    this.loadBooks();
  }

  loadBooks(): void {
    this.isLoading = true;
    const pageRequest = this.currentPage - 1;

    if (this.searchQuery.trim() !== '') {
      const searchData = { param: this.searchQuery.trim(), genreId: null, authorId: null };
      this.bookService.searchBooks(searchData, pageRequest, this.itemsPerPage).subscribe({
        next: (data: any) => this.handleBookData(data),
        error: (err) => { console.error(err); this.isLoading = false; }
      });
    } else {
      this.bookService.getBooks(pageRequest, this.itemsPerPage).subscribe({
        next: (data: any) => this.handleBookData(data),
        error: (err) => { console.error(err); this.isLoading = false; }
      });
    }
  }

  handleBookData(data: any): void {
    const bookList = data.content ? data.content : data;
    this.books = bookList;
    this.paginatedBooks = this.books;
    this.totalPages = data.totalPages !== undefined ? data.totalPages : 1;
    this.isLoading = false;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadBooks();
    }
  }

  performSearch(): void {
    this.currentPage = 1;
    this.loadBooks();
  }

  resetSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadBooks();
  }

  // ==========================================
  // XỬ LÝ MƯỢN SÁCH TỐI ƯU
  // ==========================================
  borrow(book: Book): void { 
    this.selectedBook = book; 
    this.showBorrowBook = true; 
    
    // Đóng Modal chi tiết nếu đang mở
    this.closeForm(); 
    this.selectedBook = book; 

    this.userSearchQuery = ''; 
    this.users = []; 
    this.selectedUserId = null;
    this.selectedUserObj = null;
  }

  onSearchUser(): void {
    clearTimeout(this.searchUserTimeout);
    const query = this.userSearchQuery.trim();
    if (!query) { this.users = []; return; }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    this.searchUserTimeout = setTimeout(() => {
      this.http.post<any[]>(`${environment.apiUrl}/system/search-user`, { param: query }, { headers: { Authorization: `Bearer ${token}` } })
        .subscribe({ 
          next: (data) => { this.users = data; }, 
          error: (err) => console.error(err) 
        });
    }, 300);
  }

  selectUserObj(user: any): void { 
    this.selectedUserId = user.id; 
    this.selectedUserObj = user;
    this.userSearchQuery = ''; 
    this.users = []; 
  }

  clearSelectedUser(): void {
    this.selectedUserId = null;
    this.selectedUserObj = null;
  }

  confirmBorrow(): void {
    if (!this.selectedUserId || !this.selectedBook) { alert('Vui lòng chọn sách và người dùng!'); return; }
    
    this.isSubmittingBorrow = true;
    const token = localStorage.getItem('authToken');
    if (!token) { this.isSubmittingBorrow = false; return; }

    this.http.post(`${environment.apiUrl}/system/add-borrowBook`, { user: { id: this.selectedUserId }, book: { id: this.selectedBook.id } }, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: () => { 
          alert(`Mượn sách thành công cho độc giả ${this.selectedUserObj.fullname}!`); 
          this.isSubmittingBorrow = false;
          this.closeBorrowBookForm(); 
          this.loadBooks(); 
        },
        error: (err) => { 
          console.error(err); 
          this.isSubmittingBorrow = false;
          alert(err.error?.message || 'Lỗi mượn sách!'); 
        }
      });
  } 

  closeBorrowBookForm(): void { 
    this.showBorrowBook = false; 
    this.selectedBook = null; 
    this.selectedUserId = null; 
    this.selectedUserObj = null;
    this.userSearchQuery = '';
    this.users = [];
  }
  
  // ==========================================
  // XỬ LÝ QUẢN TRỊ (XEM, THÊM, SỬA, XÓA)
  // ==========================================
  trackByBookId(index: number, book: Book): number { return book.id; }
  
  showDetails(book: Book): void { this.selectedBook = book; }
  
  closeForm(): void { this.selectedBook = null; }
  
  openAddBookForm(): void { 
    this.resetNewBookForm(); 
    this.showAddBookForm = true; 
  }
  
  closeAddBookForm(): void { this.showAddBookForm = false; }
  
  openEditBookForm(book: Book): void { 
    this.newBook = { ...book }; 
    
    // Đề phòng trường hợp sách cũ chưa có location
    if (!this.newBook.location) {
      this.newBook.location = { id: 0, room: '', shelf: '' };
    }
    
    // Nếu sách cũ chưa chọn tác giả/thể loại thì set = 0 để form hiển thị default
    if (!this.newBook.author) this.newBook.author = { id: 0, fullname: '', nationality: '' };
    if (!this.newBook.genres) this.newBook.genres = { id: 0, name: '' };

    this.showAddBookForm = true; 
  }

  saveNewBook(): void {
    if (!this.validateBook(this.newBook)) { 
      alert('Vui lòng điền tất cả các trường bắt buộc.');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    const payload: any = {
      ...this.newBook,
      author: { id: Number(this.newBook.author.id) },
      genres: { id: Number(this.newBook.genres.id) }
    };

    delete payload.qrCode;
    if (payload.id === 0) payload.id = null;

    this.http.post<Book>(`${environment.apiUrl}/system/add-update-book`, payload, { 
      headers: { Authorization: `Bearer ${token}` } 
    }).subscribe({
      next: () => { 
        alert(this.newBook.id === 0 ? 'Thêm sách mới thành công!' : 'Sách đã được cập nhật thành công!'); 
        this.closeAddBookForm(); 
        this.loadBooks(); 
      },
      error: (err) => {
        console.error(err);
        alert('Có lỗi xảy ra khi lưu sách!');
      }
    });
  }

  private validateBook(book: Book): boolean { 
    return (!!book.name && book.author.id > 0 && book.genres.id > 0 && book.numberPage > 0 && book.publishYear > 0 && !!book.description && book.quantity >= 0); 
  }

  resetNewBookForm(): void { 
    this.newBook = { 
      id: 0, 
      name: '', 
      image: '', 
      numberPage: 0, 
      publishYear: 0, 
      description: '', 
      quantity: 0, 
      author: { id: 0, fullname: '', nationality: '' }, 
      genres: { id: 0, name: '' }, 
      qrCode: '', 
      location: { id: 0, room: '', shelf: ''} 
    }; 
  }

  deleteBook(bookId: number): void { this.bookToDeleteId = bookId; this.showDeleteConfirm = true; }
  
  confirmDelete(): void {
    if (!this.bookToDeleteId) return;
    const token = localStorage.getItem('authToken');
    if (!token) return;

    this.http.delete(`${environment.apiUrl}/system/delete-book?id=${this.bookToDeleteId}`, { 
      headers: { Authorization: `Bearer ${token}` } 
    }).subscribe({
      next: () => { 
        this.showDeleteConfirm = false; 
        this.bookToDeleteId = null; 
        this.deleteSuccessful = true; 
        this.loadBooks(); 
      },
      error: (err) => { 
        console.error(err); 
        this.showDeleteConfirm = false; 
        alert('Lỗi khi xóa sách! Có thể sách đang được mượn.');
      }
    });
  }

  cancelDelete(): void { 
    this.showDeleteConfirm = false; 
    this.bookToDeleteId = null; 
    this.deleteSuccessful = false; 
    this.updateSuccessful = false; 
  }
  
  loadAuthorsAndGenres(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    this.http.post<{ id: number; fullname: string }[]>(`${environment.apiUrl}/public/search-author`, { headers }).subscribe({ next: (data) => this.authors = data });
    this.http.post<{ id: number; name: string }[]>(`${environment.apiUrl}/public/search-genre`, { headers }).subscribe({ next: (data) => this.genres = data });
  }
}