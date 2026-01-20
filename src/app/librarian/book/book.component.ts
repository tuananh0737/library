import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { HttpClient } from '@angular/common/http';
import { Router,ActivatedRoute  } from '@angular/router';
import { environment } from '../../../environments/environment';

interface Book {
  id: number;
  name: string;
  numberPage: number;
  publishYear: number;
  description: string;
  quantity: number;
  author: {
    id: number; 
    fullname: string;
    nationality: string;
  };
  genres: {
    id: number; 
    name: string;
  };
}


@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.css']
})
export class BookLibrarianComponent implements OnInit {
  books: Book[] = [];
  originalBooks: Book[] = [];
  selectedBook: Book | null = null;
  showOutOfStock: boolean = false;
  searchQuery: string = '';
  updateSuccessful: boolean = false;
  showBorrowBook: boolean = false;
  users: { id: number; fullname: string; idCard: string; phone: string  }[] = [];
  userSearchQuery: string = '';
  selectedUserId: number | null = null;

  showAddBookForm: boolean = false; 

  newBook: Book = {
    id: 0,
    name: '',
    numberPage: 0,
    publishYear: 0,
    description: '',
    quantity: 0,
    author: { id: 0, fullname: '', nationality: '' },
    genres: { id: 0, name: '' }
  };

  constructor(
    private bookService: BookService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.bookService.getBooks().subscribe({
      next: (data) => {
        this.books = data;
        this.originalBooks = [...data];
  
        this.route.queryParams.subscribe((params) => {
          const bookId = params['bookId'];
          if (bookId) {
            const selectedBook = this.books.find((book) => book.id === +bookId);
            if (selectedBook) {
              this.showDetails(selectedBook); 
            }
          }
        });
      },
      error: (err) => {
        console.error('Lỗi khi gọi API:', err);
      },
    });
  }


  borrow(book: Book): void {
    this.selectedBook = book;
    this.showBorrowBook = true;
    this.userSearchQuery = '';
    this.users = [];
  }

  searchUser(): void {
    const query = this.userSearchQuery.trim();
    if (!query) {
      alert('Vui lòng nhập từ khóa để tìm kiếm người dùng!');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Bạn chưa đăng nhập!');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const url = `${environment.apiUrl}/system/search-user`;

    this.http
      .post<{ id: number; fullname: string; idCard: string; phone: string }[]>(
        url,
        { param: query },
        { headers }
      )
      .subscribe({
        next: (data) => {
          this.users = data;
          if (this.users.length === 0) {
            alert('Không tìm thấy người dùng nào.');
          }
        },
        error: (err) => {
          console.error('Lỗi khi tìm kiếm người dùng:', err);
        },
      });
  }

  selectUser(userId: number): void {
    this.selectedUserId = userId;
  }

  confirmBorrow(): void {
    if (!this.selectedUserId || !this.selectedBook) {
      alert('Vui lòng chọn sách và người dùng!');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Bạn chưa đăng nhập!');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const url = `${environment.apiUrl}/system/add-borrowBook`;

    const borrowData = {
      user: { id: this.selectedUserId },
      book: { id: this.selectedBook.id },
    };

    this.http.post(url, borrowData, { headers }).subscribe({
      next: () => {
        alert('Mượn sách thành công!');
        this.showBorrowBook = false;
        this.selectedUserId = null;
      },
      error: (err) => {
        console.error('Lỗi khi mượn sách:', err);
        alert('Đã xảy ra lỗi khi mượn sách. Vui lòng thử lại!');
      },
    });
  } 

  closeBorrowBookForm(): void {
    this.showBorrowBook = false;
    this.selectedBook = null;
    this.selectedUserId = null;
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

  closeOverlay(): void {
    this.showOutOfStock = false;
  }

  performSearch(): void {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      alert('Vui lòng nhập từ khóa để tìm kiếm.');
      return;
    }

    this.books = this.originalBooks.filter((book) =>
      book.name.toLowerCase().includes(query) ||
      book.author.fullname.toLowerCase().includes(query) ||
      book.genres.name.toLowerCase().includes(query)
    );

    if (this.books.length === 0) {
      alert('Không tìm thấy sách nào phù hợp.');
    }
  }

  resetSearch(): void {
    this.books = [...this.originalBooks];
    this.searchQuery = '';
  } 

}
