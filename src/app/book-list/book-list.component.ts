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
  // --- Dữ liệu Sách & Bookmark ---
  books: any[] = [];
  filteredBooks: any[] = [];
  selectedBook: any = null;
  myBookmarks: any[] = [];

  // --- Biến Tìm kiếm (Đã gộp) ---
  searchText: string = '';
  searchType: string = 'name'; // Mặc định tìm theo tên

  // --- Biến Phân trang ---
  currentPage: number = 1;
  itemsPerPage: number = 30; // Giới hạn 30 cuốn/trang
  paginatedBooks: any[] = [];
  totalPages: number = 0;

  // --- Biến Đánh giá & Bình luận ---
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
        // Gán dữ liệu lọc ban đầu
        this.filteredBooks = this.books;
        
        // Cập nhật phân trang
        this.updatePaginatedBooks();

        this.loadUserBookmarks();
      },
      error: (err) => console.error('Lỗi tải sách:', err)
    });
  }

  // --- LOGIC PHÂN TRANG ---
  updatePaginatedBooks() {
    this.totalPages = Math.ceil(this.filteredBooks.length / this.itemsPerPage);

    if (this.currentPage > this.totalPages && this.totalPages > 0) {
        this.currentPage = 1;
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    
    this.paginatedBooks = this.filteredBooks.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedBooks();
      // Cuộn lên đầu vùng kết quả
      const element = document.querySelector('.results-area');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // --- CÁC HÀM XỬ LÝ DỮ LIỆU ---

  decodeToken(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUserInfo = {
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

  loadBookComments(bookId: number): void {
    const myUser = this.currentUserInfo?.username ? String(this.currentUserInfo.username).toLowerCase() : '';
    const myEmail = this.currentUserInfo?.email ? String(this.currentUserInfo.email).toLowerCase() : '';

    this.commentService.getCommentsByBook(bookId).subscribe({
      next: (data: any[]) => {
        this.comments = data.map(c => {
          let isOwner = false;
          if (c.user) {
            const apiUsername = String(c.user.username || c.user.sub || '').toLowerCase();
            const apiEmail = String(c.user.email || '').toLowerCase();
            if (myUser && apiUsername && myUser === apiUsername) {
              isOwner = true;
            } else if (myEmail && apiEmail && myEmail === apiEmail) {
              isOwner = true;
            }
          }
          const canDelete = this.isAdmin || isOwner;
          return {
            id: c.id,
            user: c.user ? (c.user.fullname || c.user.username || 'Người dùng') : 'Ẩn danh',
            rating: c.star,
            content: c.content,
            date: c.createdDate ? new Date(c.createdDate) : new Date(),
            isCurrentUser: canDelete
          };
        });
        this.comments.sort((a, b) => b.date.getTime() - a.date.getTime());
      },
      error: (err) => console.error('Lỗi tải bình luận:', err)
    });
  }

  deleteComment(comment: any): void {
    if (!confirm('Bạn có chắc muốn xóa bình luận này không?')) return;
    if (comment.id) {
      if (this.isAdmin) {
        this.commentService.deleteCommentByAdmin(comment.id).subscribe({
          next: () => {
            this.comments = this.comments.filter(c => c.id !== comment.id);
            alert('Đã xóa bình luận (Admin).');
          },
          error: (err) => { this.retryDeleteAsUser(comment); }
        });
      } else {
        this.retryDeleteAsUser(comment);
      }
    }
  }

  retryDeleteAsUser(comment: any): void {
    this.commentService.deleteComment(comment.id).subscribe({
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
          const newComment = {
            id: response?.id, 
            user: 'Tôi (Bạn)', 
            rating: rating,
            content: content,
            date: new Date(),
            isCurrentUser: true 
          };
          this.comments.unshift(newComment);
          this.closeReviewForm();
        },
        error: (err) => {
          console.error(err);
          alert('Lỗi gửi bình luận: ' + (err.error?.message || 'Vui lòng thử lại'));
        }
      });
  }

  loadUserBookmarks(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return;
    }
    this.bookmarkService.getBookmarks().subscribe({
      next: (bookmarks: any[]) => {
        this.myBookmarks = bookmarks;
        this.books.forEach(book => {
          const isBookmarked = this.myBookmarks.some(bm => bm.book.id === book.id);
          book.isFavorite = isBookmarked;
        });
        
        if (this.selectedBook) {
          const updatedBook = this.books.find(b => b.id === this.selectedBook.id);
          if (updatedBook) this.selectedBook.isFavorite = updatedBook.isFavorite;
        }
      },
      error: (err) => console.error('Lỗi tải bookmark:', err)
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
          },
          error: (err) => alert('Lỗi: ' + (err.error?.message || err.message))
        });
      }
    } else {
      this.bookmarkService.addBookmark(book.id).subscribe({
        next: () => {
          book.isFavorite = true;
          this.loadUserBookmarks(); 
          alert('Đã thêm vào danh sách yêu thích.');
        },
        error: (err) => alert('Lỗi: ' + (err.error?.message || err.message))
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

  closeReviewForm(): void {
    this.showReviewModal = false;
  }

  setRating(star: number): void {
    this.tempRating = star;
  }

  onBorrow(bookId: number): void {
    this.router.navigate(['/borrow'], { queryParams: { bookId: bookId } });
  }

  // --- LOGIC TÌM KIẾM MỚI ---
  onSearch(): void {
    this.selectedBook = null;
    this.currentPage = 1; // Reset về trang 1

    const query = this.searchText.toLowerCase().trim();

    this.filteredBooks = this.books.filter(book => {
      // Nếu không nhập gì thì hiện tất cả
      if (!query) return true;

      switch (this.searchType) {
        case 'name':
          return book.name.toLowerCase().includes(query);
        case 'author':
          return book.author?.fullname?.toLowerCase().includes(query) ?? false;
        case 'genre':
          return book.genres?.name?.toLowerCase().includes(query) ?? false;
        default:
          return true;
      }
    });

    this.updatePaginatedBooks(); // Cập nhật danh sách hiển thị
  }

  resetSearch(): void {
    this.searchText = '';
    this.searchType = 'name'; // Reset về mặc định
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
}