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
  
  // --- Loading & Pagination ---
  isLoading: boolean = false;
  currentPage: number = 1; 
  itemsPerPage: number = 8; 
  totalPages: number = 1;

  // --- UI States ---
  updateSuccessful: boolean = false;
  showBorrowBook: boolean = false;
  showAddBookForm: boolean = false; 
  showDeleteConfirm: boolean = false;
  deleteSuccessful: boolean = false;
  bookToDeleteId: number | null = null;

  // --- Form Data ---
  users: { id: number; fullname: string; idCard: string; phone: string }[] = [];
  userSearchQuery: string = '';
  selectedUserId: number | null = null;
  authors: { id: number; fullname: string }[] = [];
  genres: { id: number; name: string }[] = [];

  newBook: Book = {
    id: 0, name: '', numberPage: 0, publishYear: 0, description: '', quantity: 0,
    author: { id: 0, fullname: '', nationality: '' }, genres: { id: 0, name: '' },
    qrCode: '', location: { id: 0, room: '', shelf: ''}
  };

  constructor(private bookService: BookService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAuthorsAndGenres();
    this.loadBooks();
  }

  // === TẢI DỮ LIỆU & PHÂN TRANG BẰNG BACKEND ===
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

  // === GIỮ NGUYÊN CÁC HÀM CŨ ===
  borrow(book: Book): void {
    this.selectedBook = book; this.showBorrowBook = true; this.userSearchQuery = ''; this.users = [];
  }
  searchUser(): void {
    const query = this.userSearchQuery.trim();
    if (!query) { alert('Vui lòng nhập từ khóa!'); return; }
    const token = localStorage.getItem('authToken');
    if (!token) return;
    this.http.post<any[]>(`${environment.apiUrl}/system/search-user`, { param: query }, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: (data) => { this.users = data; if (this.users.length === 0) alert('Không tìm thấy người dùng nào.'); },
        error: (err) => console.error(err)
      });
  }
  selectUser(userId: number): void { this.selectedUserId = userId; }
  confirmBorrow(): void {
    if (!this.selectedUserId || !this.selectedBook) { alert('Vui lòng chọn sách và người dùng!'); return; }
    const token = localStorage.getItem('authToken');
    if (!token) return;
    this.http.post(`${environment.apiUrl}/system/add-borrowBook`, { user: { id: this.selectedUserId }, book: { id: this.selectedBook.id } }, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: () => { alert('Mượn sách thành công!'); this.showBorrowBook = false; this.selectedUserId = null; },
        error: (err) => { console.error(err); alert('Lỗi mượn sách!'); }
      });
  } 
  closeBorrowBookForm(): void { this.showBorrowBook = false; this.selectedBook = null; this.selectedUserId = null; }
  trackByBookId(index: number, book: Book): number { return book.id; }
  showDetails(book: Book): void { this.selectedBook = book; }
  closeForm(): void { this.selectedBook = null; }
  openAddBookForm(): void { this.resetNewBookForm(); this.showAddBookForm = true; }
  closeAddBookForm(): void { this.showAddBookForm = false; }
  saveNewBook(): void {
    if (this.validateBook(this.newBook)) { this.newBook.id ? this.updateBook() : this.addBook(); } 
    else { alert('Vui lòng điền tất cả các trường bắt buộc.'); }
  }
  private validateBook(book: Book): boolean { return (!!book.name && book.author.id > 0 && book.genres.id > 0 && book.numberPage > 0 && book.publishYear > 0 && !!book.description && book.quantity >= 0); }
  addBook(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const bookData = { ...this.newBook, author: { id: this.newBook.author.id }, genres: { id: this.newBook.genres.id } };
    this.http.post<Book>(`${environment.apiUrl}/admin/add-update-book`, bookData, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: (response) => { alert(`Sách đã được thêm thành công!`); this.closeAddBookForm(); this.loadBooks(); }, // Gọi lại loadBooks để lấy data mới
      error: (err) => console.error(err)
    });
  }
  openEditBookForm(book: Book): void { this.newBook = { ...book }; this.showAddBookForm = true; }
  updateBook(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    this.http.put<Book>(`${environment.apiUrl}/admin/add-update-book`, this.newBook, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: (response) => { alert(`Sách đã được cập nhật!`); this.closeAddBookForm(); this.loadBooks(); },
      error: (err) => console.error(err)
    });
  }
  resetNewBookForm(): void { this.newBook = { id: 0, name: '', numberPage: 0, publishYear: 0, description: '', quantity: 0, author: { id: 0, fullname: '', nationality: '' }, genres: { id: 0, name: '' }, qrCode: '', location: { id: 0, room: '', shelf: ''} }; }
  deleteBook(bookId: number): void { this.bookToDeleteId = bookId; this.showDeleteConfirm = true; }
  confirmDelete(): void {
    if (!this.bookToDeleteId) return;
    const token = localStorage.getItem('authToken');
    if (!token) return;
    this.http.delete(`${environment.apiUrl}/admin/delete-book?id=${this.bookToDeleteId}`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: () => { this.showDeleteConfirm = false; this.bookToDeleteId = null; this.deleteSuccessful = true; this.loadBooks(); },
      error: (err) => { console.error(err); this.showDeleteConfirm = false; }
    });
  }
  cancelDelete(): void { this.showDeleteConfirm = false; this.bookToDeleteId = null; this.deleteSuccessful = false; this.updateSuccessful = false; }
  loadAuthorsAndGenres(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    this.http.post<{ id: number; fullname: string }[]>(`${environment.apiUrl}/public/search-author`, { headers }).subscribe({ next: (data) => this.authors = data });
    this.http.post<{ id: number; name: string }[]>(`${environment.apiUrl}/public/search-genre`, { headers }).subscribe({ next: (data) => this.genres = data });
  }
}