import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { BookmarkService } from '../services/bookmark.service';
import { CommentService } from '../services/comment.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-book-list',
  templateUrl: './book-list.component.html',
  styleUrls: ['./book-list.component.css']
})
export class BookListComponent implements OnInit {
  // --- Dữ liệu ---
  books: any[] = [];
  filteredBooks: any[] = [];
  selectedBook: any = null;
  myBookmarks: any[] = [];

  // --- Tìm kiếm ---
  searchText: string = '';
  searchType: string = 'name';

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
  currentUserInfo: any = null; 

  constructor(
    private bookService: BookService,
    private bookmarkService: BookmarkService,
    private commentService: CommentService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.decodeToken();
    this.bookService.getBooks().subscribe({
      next: (data) => {
        this.books = data.map((b: any) => ({ ...b, isFavorite: false }));
        this.filteredBooks = this.books;
        this.updatePaginatedBooks();
        this.loadUserBookmarks();
      },
      error: (err) => console.error('Lỗi tải sách:', err)
    });
  }

  // --- LOGIC TOKEN & USER ---
  decodeToken(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUserInfo = {
          id: payload.id || payload.userId, // Quan trọng: Lấy ID
          username: payload.sub || payload.username || '',
          email: payload.email || ''
        };
        const roles = payload.role || payload.roles || payload.authorities || '';
        if (String(roles).toUpperCase().includes('ADMIN')) {
          this.isAdmin = true;
        }
      } catch (e) {
        console.error('Lỗi đọc token:', e);
      }
    }
  }

  // --- LOGIC BÌNH LUẬN (Đã chuẩn hóa) ---
  loadBookComments(bookId: number): void {
    const currentUserId = this.currentUserInfo?.id;

    this.commentService.getCommentsByBook(bookId).subscribe({
      next: (data: any[]) => {
        this.comments = data.map(c => {
          let isOwner = false;
          
          if (c.user && currentUserId) {
            if (c.user.id && c.user.id === currentUserId) isOwner = true;
            else if (typeof c.user === 'number' && c.user === currentUserId) isOwner = true;
          }
          
          const hasRealPermission = this.isAdmin || isOwner;
          
          return {
            id: c.id,
            user: c.user ? (c.user.fullname || c.user.username || 'Người dùng') : 'Ẩn danh',
            rating: c.star,
            content: c.content,
            date: c.createdDate ? new Date(c.createdDate) : new Date(),
            
            isCurrentUser: true,         // Luôn hiện icon xóa
            canDelete: hasRealPermission // Check quyền khi click
          };
        });
        this.comments.sort((a, b) => b.date.getTime() - a.date.getTime());
      },
      error: (err) => console.error('Lỗi tải bình luận:', err)
    });
  }

  deleteComment(comment: any): void {
    if (!comment.canDelete) {
        alert('Bạn không có quyền xóa bình luận này!');
        return;
    }

    if (!confirm('Bạn có chắc muốn xóa bình luận này không?')) return;
    
    const deleteObs = this.isAdmin 
        ? this.commentService.deleteCommentByAdmin(comment.id)
        : this.commentService.deleteComment(comment.id);

    deleteObs.subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== comment.id);
        alert('Đã xóa bình luận.');
      },
      error: (err) => alert('Không thể xóa: ' + (err.error?.message || 'Lỗi server'))
    });
  }

  submitReview(): void {
    if (this.tempRating === 0) {
      alert('Vui lòng chọn số sao đánh giá!');
      return;
    }
    const rating = this.tempRating;
    const content = this.tempComment;
    this.commentService.addComment(content, rating, this.selectedBook.id)
      .subscribe({
        next: (response: any) => {
          alert('Gửi đánh giá thành công!');
          this.loadBookComments(this.selectedBook.id);
          this.closeReviewForm();
        },
        error: (err) => {
          console.error(err);
          alert('Lỗi gửi bình luận: ' + (err.error?.message || 'Vui lòng thử lại'));
        }
      });
  }

  // --- LOGIC PHÂN TRANG & TÌM KIẾM ---
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
      const element = document.querySelector('.results-area');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onSearch(): void {
    this.selectedBook = null;
    this.currentPage = 1; 

    const query = this.searchText.toLowerCase().trim();

    this.filteredBooks = this.books.filter(book => {
      if (!query) return true;
      switch (this.searchType) {
        case 'name': return book.name.toLowerCase().includes(query);
        case 'author': return book.author?.fullname?.toLowerCase().includes(query) ?? false;
        case 'genre': return book.genres?.name?.toLowerCase().includes(query) ?? false;
        default: return true;
      }
    });

    this.updatePaginatedBooks();
  }

  resetSearch(): void {
    this.searchText = '';
    this.searchType = 'name';
    this.filteredBooks = [...this.books];
    this.selectedBook = null;
    this.currentPage = 1;
    this.updatePaginatedBooks();
  }

  getPlaceholder(): string {
    switch (this.searchType) {
      case 'name': return 'Nhập tên sách...';
      case 'author': return 'Nhập tên tác giả...';
      case 'genre': return 'Nhập thể loại...';
      default: return 'Tìm kiếm...';
    }
  }

  // --- LOGIC KHÁC ---
  loadUserBookmarks(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    this.bookmarkService.getBookmarks().subscribe({
      next: (bookmarks: any[]) => {
        this.myBookmarks = bookmarks;
        this.books.forEach(book => {
          book.isFavorite = this.myBookmarks.some(bm => bm.book.id === book.id);
        });
        
        if (this.selectedBook) {
          const updatedBook = this.books.find(b => b.id === this.selectedBook.id);
          if (updatedBook) this.selectedBook.isFavorite = updatedBook.isFavorite;
        }
      }
    });
  }

  onSelectBook(book: any): void {
    this.selectedBook = book;
    this.comments = []; 
    this.loadBookComments(book.id);
  }

  closeDetail(): void {
    this.selectedBook = null;
    this.showReviewModal = false;
  }

  toggleFavorite(event: Event, book: any): void {
    event.stopPropagation();
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Bạn cần đăng nhập để thực hiện chức năng này!');
      return;
    }
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

  openReviewForm(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Vui lòng đăng nhập để bình luận!');
      return;
    }
    this.showReviewModal = true;
    this.tempRating = 0; 
    this.tempComment = '';
  }

  closeReviewForm(): void { this.showReviewModal = false; }
  setRating(star: number): void { this.tempRating = star; }
  onBorrow(bookId: number): void {
    this.router.navigate(['/borrow'], { queryParams: { bookId: bookId } });
  }
}