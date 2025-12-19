import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';



interface Book {
  id: number;
  name: string;
  numberPage: number;
  publishYear: number;
  description: string;
  quantity: number;
  author: {
    fullname: string;
    nationality: string;
  };
  genres: {
    name: string;
  };
  averageRating: number;
  location: {
    room: string;
    shelf: string;
  }
}

@Component({
  selector: 'app-book-list',
  templateUrl: './book-list.component.html',
  styleUrls: ['./book-list.component.css']
})
export class BookListComponent implements OnInit {
  books: Book[] = []; 
  originalBooks: Book[] = []; 
  selectedBook: Book | null = null;
  showOutOfStock = false;
  searchQuery: string = ''; 

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
  
        this.route.queryParams.subscribe(params => {
          const genre = params['genre'];
          if (genre) {
            this.searchQuery = genre;
            this.performSearch(); 
          }
        });
      },
      error: (err) => {
        console.error('Lỗi khi gọi API:', err);
      }
    });
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
    if (!this.originalBooks || this.originalBooks.length === 0) {
      console.error('Danh sách sách chưa được tải.');
      return;
    }
  
    const query = this.searchQuery.toLowerCase().trim();
  
    if (!query) {
      alert('Vui lòng nhập từ khóa để tìm kiếm.');
      return;
    }
  
    this.books = this.originalBooks.filter(book =>
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

    addBookmark(book: Book | null): void {
      if (!book) {
        console.error('Không thể thêm bookmark vì sách không hợp lệ.');
        return;
      }
    
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Bạn cần đăng nhập để sử dụng chức năng này.');
        return;
      }
    
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      });
    
      const body = { book: { id: book.id } };
    
      this.http.post('api/user/add-bookmark', body, { headers }).subscribe({
        next: () => {
          alert('Đã thêm sách vào bookmark.');
        },
        error: (err) => {
          const errorMessage =
            err.error?.message || 'Không thể thêm sách vào bookmark.';
          console.error('Lỗi khi thêm bookmark:', err);
          alert(errorMessage);
        },
      });
    }
    
    //binh luan
  showCommentForm: boolean = false; 
  commentContent: string = ''; 
  commentStar: number = 5; 
  currentBookId: number | null = null; 

  openCommentForm(book: Book | null): void {
    if (!book) {
      console.error('Không thể mở form vì sách không hợp lệ.');
      return;
    }

    this.showCommentForm = true;
    this.currentBookId = book.id;
    this.commentContent = '';
    this.commentStar = 5;
  }


  closeCommentForm(): void {
    this.showCommentForm = false;
    this.currentBookId = null;
    this.commentContent = '';
    this.commentStar = 5;
  }

  stars = [1, 2, 3, 4, 5]; 

  setStarRating(rating: number): void {
    this.commentStar = rating;
  }


  submitComment(): void {
    if (!this.currentBookId) {
      console.error('Không thể gửi bình luận vì sách không hợp lệ.');
      return;
    }

    if (!this.commentContent.trim()) {
      alert('Vui lòng nhập nội dung bình luận.');
      return;
    }

    if (this.commentStar < 1 || this.commentStar > 5) {
      alert('Số sao đánh giá phải từ 1 đến 5.');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Bạn cần đăng nhập để sử dụng chức năng này.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const body = {
      content: this.commentContent,
      star: this.commentStar,
      book: { id: this.currentBookId },
    };

    this.http.post('/api/user/add-comment', body, { headers }).subscribe({
      next: () => {
        alert('Bình luận đã được gửi thành công.');
        this.closeCommentForm();
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Không thể gửi bình luận.';
        console.error('Lỗi khi gửi bình luận:', err);
        alert(errorMessage);
      },
    });
  }
 
  //phân trang
  currentPage: number = 1; 
  pageSize: number = 8; 
  paginatedBooks: any[] = []; 
  totalPages: number = 1; 

  loadBooks(): void {
    this.bookService.getBooks().subscribe({
      next: (data) => {
        console.log('Dữ liệu từ API:', data);
        this.books = data;
        this.totalPages = Math.ceil(this.books.length / this.pageSize);
        this.updatePagination();
      },
      error: (err) => {
        console.error('lỗi khi gọi api', err);
      }
    })
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedBooks = this.books.slice(startIndex, endIndex);
  }
  
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
  
    this.currentPage = page;
    this.updatePagination();
  }
}
