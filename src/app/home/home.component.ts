import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { BookmarkService } from '../services/bookmark.service';
import { CommentService } from '../services/comment.service';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  books: any[] = [];
  filteredBooks: any[] = [];
  selectedBook: any = null;
  myBookmarks: any[] = [];
  
  // --- Tìm kiếm & Lọc ---
  searchQuery: string = '';
  activeCategory: string = 'All';
  categories = ['All', 'Kinh dị', 'Khoa học', 'Văn học', 'Lịch sử', 'Công nghệ', 'Tiểu thuyết'];

  // --- Phân trang ---
  currentPage: number = 1;
  itemsPerPage: number = 30;
  paginatedBooks: any[] = [];
  totalPages: number = 0;

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
    this.loadInitialData(); // Gọi hàm tải dữ liệu tối ưu
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

  // TẢI DỮ LIỆU SONG SONG (Cải thiện tốc độ load trang)
  loadInitialData(): void {
    const token = localStorage.getItem('authToken');

    // 1. Tạo request lấy danh sách sách
    const booksRequest = this.bookService.getBooks();
    
    // 2. Tạo request lấy bookmark (nếu có đăng nhập thì lấy, không thì trả về mảng rỗng)
    const bookmarksRequest = token 
      ? this.bookmarkService.getBookmarks().pipe(catchError(() => of([])))
      : of([]);

    // 3. Dùng forkJoin để bắn 2 API chạy cùng lúc
    forkJoin({ books: booksRequest, bookmarks: bookmarksRequest }).subscribe({
      next: (response: { books: any[], bookmarks: any[] }) => {
        this.myBookmarks = response.bookmarks;

        // Map trạng thái yêu thích ngay từ đầu, tránh render lại nhiều lần
        this.books = response.books.map((b: any) => {
          const isFav = this.myBookmarks.some((bm: any) => bm.book.id === b.id);
          return { ...b, isFavorite: isFav };
        });

        this.filteredBooks = [...this.books];
        this.updatePaginatedBooks();

        // Tự động chọn cuốn sách đầu tiên để hiển thị chi tiết
        if (this.books.length > 0) {
          this.onSelectBook(this.books[0]);
        }
      },
      error: (err) => console.error('Lỗi tải dữ liệu ban đầu:', err)
    });
  }

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

  updatePaginatedBooks() {
    this.totalPages = Math.ceil(this.filteredBooks.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) this.currentPage = 1;
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedBooks = this.filteredBooks.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedBooks();
      const element = document.querySelector('.book-grid');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Hàm này giờ chỉ chạy khi User bấm Thêm/Xóa tim để đồng bộ lại dữ liệu
  loadUserBookmarks(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return; 

    this.bookmarkService.getBookmarks().subscribe({
      next: (bookmarks: any[]) => {
        this.myBookmarks = bookmarks;
        this.books.forEach(book => {
          book.isFavorite = this.myBookmarks.some(bm => bm.book.id === book.id);
        });
        this.applyFilters();
        if (this.selectedBook) {
          const updatedBook = this.books.find(b => b.id === this.selectedBook.id);
          if (updatedBook) this.selectedBook.isFavorite = updatedBook.isFavorite;
        }
      }
    });
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

  onSearch() { 
      this.currentPage = 1;
      this.applyFilters(); 
  }
  
  filterCategory(cat: string) {
    this.activeCategory = cat;
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    let tempBooks = [...this.books];
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      tempBooks = tempBooks.filter(b => 
        b.name.toLowerCase().includes(query) || 
        b.author?.fullname.toLowerCase().includes(query)
      );
    }
    if (this.activeCategory !== 'All') {
      tempBooks = tempBooks.filter(b => 
        b.genres?.name && b.genres.name.toLowerCase().includes(this.activeCategory.toLowerCase())
      );
    }
    this.filteredBooks = tempBooks;
    this.updatePaginatedBooks();
  }

  onSelectBook(book: any): void {
    this.selectedBook = book;
    this.comments = []; 
    this.loadBookComments(book.id); 
  }

  borrowBook(bookId: number) {
      this.router.navigate(['/borrow'], { queryParams: { bookId: bookId } });
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
}