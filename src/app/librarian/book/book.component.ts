import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
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
export class BookLibrarianComponent implements OnInit {
  books: Book[] = [];
  paginatedBooks: Book[] = []; 
  selectedBook: Book | null = null;
  searchQuery: string = '';
  
  isLoading: boolean = false;
  currentPage: number = 1; 
  itemsPerPage: number = 30; 
  totalPages: number = 1;

  showDeleteConfirm: boolean = false;
  bookToDeleteId: number | null = null;

  showBorrowBook: boolean = false;
  users: any[] = []; 
  userSearchQuery: string = '';
  selectedUserId: number | null = null;
  selectedUserObj: any = null; 
  searchUserTimeout: any; 
  isSubmittingBorrow: boolean = false;

  constructor(
    private bookService: BookService, 
    private http: HttpClient, 
    private router: Router, 
    private route: ActivatedRoute
  ) {}

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
        error: (err) => { 
          console.error(err); 
          this.isLoading = false; 
        }
      });
    } else {
      this.bookService.getBooks(pageRequest, this.itemsPerPage).subscribe({
        next: (data: any) => this.handleBookData(data),
        error: (err) => { 
          console.error(err); 
          this.isLoading = false; 
        }
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

  resetSearch(): void { 
    this.searchQuery = ''; 
    this.currentPage = 1; 
    this.loadBooks(); 
  } 

  trackByBookId(index: number, book: Book): number { 
    return book.id; 
  }

  showDetails(book: Book): void { 
    this.selectedBook = book; 
  }

  closeForm(): void { 
    this.selectedBook = null; 
  }

  deleteBook(bookId: number): void { 
    this.bookToDeleteId = bookId; 
    this.showDeleteConfirm = true; 
  }
  
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
        alert('Xóa sách thành công!'); 
        this.loadBooks(); 
      },
      error: (err) => { 
        console.error(err); 
        this.showDeleteConfirm = false; 
        alert('Lỗi khi xóa sách! Có thể sách đang được mượn hoặc bạn không có quyền.');
      }
    });
  }

  cancelDelete(): void { 
    this.showDeleteConfirm = false; 
    this.bookToDeleteId = null; 
  }

  borrow(book: Book): void { 
    this.selectedBook = book; 
    this.showBorrowBook = true; 
    
    const bookDetailModal = document.getElementById('bookDetailModal');
    if(bookDetailModal) {
       this.closeForm(); 
       this.selectedBook = book; 
    }

    this.userSearchQuery = ''; 
    this.users = []; 
    this.selectedUserId = null;
    this.selectedUserObj = null;
  }

  onSearchUser(): void {
    clearTimeout(this.searchUserTimeout);
    const query = this.userSearchQuery.trim();
    
    if (!query) { 
      this.users = []; 
      return; 
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    this.searchUserTimeout = setTimeout(() => {
      this.http.post<any[]>(`${environment.apiUrl}/system/search-user`, { param: query }, { headers: { Authorization: `Bearer ${token}` } })
        .subscribe({ 
          next: (data) => { this.users = data; }, 
          error: (err) => console.error('Lỗi tìm người dùng:', err) 
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
    if (!this.selectedUserId || !this.selectedBook) { 
      alert('Vui lòng chọn sách và người dùng!'); 
      return; 
    }

    this.isSubmittingBorrow = true;
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.isSubmittingBorrow = false;
      return;
    }

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
          alert(err.error?.message || 'Có lỗi xảy ra, người dùng có thể đã mượn sách này hoặc kho đã hết!'); 
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
}