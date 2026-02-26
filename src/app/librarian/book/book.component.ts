import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

interface Book {
  id: number; name: string;image?: string; numberPage: number; publishYear: number; description: string; quantity: number;
  author: { id: number; fullname: string; nationality: string; };
  genres: { id: number; name: string; };
}

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.css']
})
export class BookLibrarianComponent implements OnInit {
  books: Book[] = [];
  paginatedBooks: Book[] = []; 
  selectedBook: Book | null = null;
  searchQuery: string = '';
  
  isLoading: boolean = false;
  currentPage: number = 1; 
  itemsPerPage: number = 8; 
  totalPages: number = 1;

  showOutOfStock: boolean = false;
  showBorrowBook: boolean = false;
  users: { id: number; fullname: string; idCard: string; phone: string }[] = [];
  userSearchQuery: string = '';
  selectedUserId: number | null = null;

  constructor(private bookService: BookService, private http: HttpClient, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
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

    this.route.queryParams.subscribe((params) => {
        const bookId = params['bookId'];
        if (bookId) {
          const matchedBook = this.books.find((b) => b.id === +bookId);
          if (matchedBook) this.showDetails(matchedBook); 
        }
    });
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

  borrow(book: Book): void { this.selectedBook = book; this.showBorrowBook = true; this.userSearchQuery = ''; this.users = []; }
  searchUser(): void {
    const query = this.userSearchQuery.trim();
    if (!query) { alert('Vui lòng nhập từ khóa!'); return; }
    const token = localStorage.getItem('authToken');
    if (!token) return;
    this.http.post<any[]>(`${environment.apiUrl}/system/search-user`, { param: query }, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({ next: (data) => { this.users = data; if (this.users.length === 0) alert('Không tìm thấy người dùng nào.'); }, error: (err) => console.error(err) });
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
  resetSearch(): void { this.searchQuery = ''; this.currentPage = 1; this.loadBooks(); } 
}