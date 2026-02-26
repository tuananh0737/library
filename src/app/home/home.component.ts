import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { BookmarkService } from '../services/bookmark.service';
import { CommentService } from '../services/comment.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  books: any[] = [];
  selectedBook: any = null;
  myBookmarks: any[] = [];
  
  // --- Tìm kiếm & Lọc ---
  searchQuery: string = '';
  activeCategory: string = 'All';
  categories = ['All', 'Kinh dị', 'Khoa học', 'Văn học', 'Lịch sử', 'Công nghệ', 'Tiểu thuyết'];
  
  categoryMap: { [key: string]: number | null } = {
    'All': null,
    'Kinh dị': 1, 
    'Khoa học': 2,
    'Văn học': 3,
    'Lịch sử': 4,
    'Công nghệ': 5,
    'Tiểu thuyết': 6
  };

  // --- Phân trang Backend & Loading ---
  currentPage: number = 1;
  itemsPerPage: number = 30;
  totalPages: number = 0;
  
  isLoading: boolean = false; // BỔ SUNG TRẠNG THÁI LOADING

  // --- Bình luận ---
  showReviewModal: boolean = false;
  tempRating: number = 0;
  tempHoverRating: number = 0;
  tempComment: string = '';
  
  comments: any[] = [];
  isAdmin: boolean = false;

  constructor(
    private bookService: BookService, 
    private bookmarkService: BookmarkService,
    private commentService: CommentService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.checkAdminRole();
    this.loadUserBookmarks();
    this.loadBooks();
  }

  checkAdminRole(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roles = payload.role || payload.roles || payload.authorities || '';
        if (String(roles).toUpperCase().includes('ADMIN')) {
          this.isAdmin = true;
        }
      } catch (e) { console.error('Lỗi đọc token:', e); }
    }
  }

  // === TẢI DỮ LIỆU TỪ SERVER (CÓ LOADING) ===
  loadBooks(): void {
    this.isLoading = true; // Bật loading
    const pageRequest = this.currentPage - 1; 
    const isSearching = this.searchQuery.trim() !== '' || this.activeCategory !== 'All';

    if (isSearching) {
      const searchData = {
        param: this.searchQuery.trim(),
        genreId: this.categoryMap[this.activeCategory] || null,
        authorId: null
      };

      this.bookService.searchBooks(searchData, pageRequest, this.itemsPerPage).subscribe({
        next: (data: any) => {
          this.handleBookData(data);
          this.isLoading = false; // Tắt loading
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false; // Tắt loading khi lỗi
        }
      });
    } else {
      this.bookService.getBooks(pageRequest, this.itemsPerPage).subscribe({
        next: (data: any) => {
          this.handleBookData(data);
          this.isLoading = false; // Tắt loading
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false; // Tắt loading khi lỗi
        }
      });
    }
  }

  handleBookData(data: any): void {
    const bookList = data.content ? data.content : data;
    this.books = bookList.map((b: any) => ({ ...b, isFavorite: false }));
    this.totalPages = data.totalPages !== undefined ? data.totalPages : 1;

    if (this.books.length > 0 && !this.selectedBook) {
      this.onSelectBook(this.books[0]);
    } else if (this.books.length === 0) {
      this.selectedBook = null;
    }
    
    this.updateFavoriteStatus();
  }

  // === CÁC HÀM XỬ LÝ SỰ KIỆN ===
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadBooks();
      const element = document.querySelector('.book-grid');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onSearch() { 
      this.currentPage = 1;
      this.loadBooks();
  }
  
  filterCategory(cat: string) {
    this.activeCategory = cat;
    this.currentPage = 1;
    this.loadBooks();
  }

  loadUserBookmarks(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return; 

    this.bookmarkService.getBookmarks().subscribe({
      next: (bookmarks: any[]) => {
        this.myBookmarks = bookmarks;
        this.updateFavoriteStatus();
      }
    });
  }

  updateFavoriteStatus() {
    if (this.books.length > 0 && this.myBookmarks.length > 0) {
      this.books.forEach(book => {
        book.isFavorite = this.myBookmarks.some(bm => bm.book.id === book.id);
      });
      if (this.selectedBook) {
        const updatedBook = this.books.find(b => b.id === this.selectedBook.id);
        if (updatedBook) this.selectedBook.isFavorite = updatedBook.isFavorite;
      }
    }
  }

  toggleFavorite(event: Event, book: any): void {
    event.stopPropagation();
    const token = localStorage.getItem('authToken');
    if (!token) { alert('Bạn cần đăng nhập!'); return; }
    
    if (book.isFavorite) {
      const bookmarkEntry = this.myBookmarks.find(bm => bm.book.id === book.id);
      if (bookmarkEntry) {
        this.bookmarkService.deleteBookmark(bookmarkEntry.id).subscribe({
          next: () => {
            book.isFavorite = false;
            this.loadUserBookmarks(); 
            alert('Đã xóa khỏi danh sách yêu thích.');
          }
        });
      }
    } else {
      this.bookmarkService.addBookmark(book.id).subscribe({
        next: () => {
          book.isFavorite = true;
          this.loadUserBookmarks(); 
          alert('Đã thêm vào danh sách yêu thích.');
        }
      });
    }
  }

  onSelectBook(book: any): void {
    this.selectedBook = book;
    this.comments = []; 
    this.loadBookComments(book.id); 
  }

  borrowBook(bookId: number) {
      this.router.navigate(['/borrow'], { queryParams: { bookId: bookId } });
  }

  // === XỬ LÝ BÌNH LUẬN ===
  loadBookComments(bookId: number): void {
    this.commentService.getCommentsByBook(bookId).subscribe({
      next: (data: any[]) => {
        this.comments = data.map(c => {
          return {
            id: c.id,
            user: c.user ? (c.user.fullname || c.user.username || 'Người dùng') : 'Ẩn danh',
            rating: c.star,
            content: c.content,
            date: c.createdDate ? new Date(c.createdDate) : new Date(),
            isCurrentUser: true 
          };
        });
        this.comments.sort((a, b) => b.date.getTime() - a.date.getTime());
      },
      error: (err) => console.error('Lỗi tải bình luận:', err)
    });
  }

  deleteComment(comment: any): void {
    if (!confirm('Bạn có chắc muốn xóa bình luận này không?')) return;
    
    const deleteObservable = this.isAdmin 
        ? this.commentService.deleteCommentByAdmin(comment.id)
        : this.commentService.deleteComment(comment.id);

    deleteObservable.subscribe({
        next: () => {
            this.comments = this.comments.filter(c => c.id !== comment.id);
            alert('Đã xóa bình luận.');
        },
        error: (err) => {
            console.error(err);
            const msg = err.error?.message || 'Bạn không có quyền xóa bình luận này!';
            alert('Xóa thất bại: ' + msg);
        }
    });
  }

  openReviewForm(): void {
    const token = localStorage.getItem('authToken');
    if (!token) { alert('Vui lòng đăng nhập để đánh giá!'); return; }
    this.showReviewModal = true;
    this.tempRating = 0;
    this.tempComment = '';
  }

  closeReviewForm(): void { this.showReviewModal = false; }
  
  setRating(star: number): void { this.tempRating = star; }

  submitReview(): void {
    if (this.tempRating === 0) {
      alert('Vui lòng chọn số sao!');
      return;
    }
    
    this.commentService.addComment(this.tempComment, this.tempRating, this.selectedBook.id)
      .subscribe({
        next: (response: any) => {
          alert('Cảm ơn bạn đã đánh giá!');
          this.closeReviewForm();
          this.loadBookComments(this.selectedBook.id);
        },
        error: (err) => {
          alert('Lỗi gửi bình luận: ' + (err.error?.message || 'Vui lòng thử lại'));
        }
      });
  }
}