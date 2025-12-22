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

  // --- Biến Tìm kiếm ---
  searchName: string = '';
  searchAuthor: string = '';
  searchGenre: string = '';

  // --- Biến Đánh giá & Bình luận ---
  showReviewModal: boolean = false;
  tempRating: number = 0;
  tempHoverRating: number = 0;
  tempComment: string = '';
  
  comments: any[] = [];
  isAdmin: boolean = false; // Biến kiểm tra quyền Admin
  currentUserInfo: any = null; // Lưu thông tin user từ token

  constructor(
    private bookService: BookService,
    private bookmarkService: BookmarkService,
    private commentService: CommentService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // 1. Giải mã Token để lấy thông tin User & Quyền Admin
    this.decodeToken();

    // 2. Tải danh sách sách
    this.bookService.getBooks().subscribe({
      next: (data) => {
        this.books = data.map((b: any) => ({ ...b, isFavorite: false }));
        // 3. Tải bookmark để cập nhật trạng thái trái tim
        this.loadUserBookmarks();
      },
      error: (err) => console.error('Lỗi tải sách:', err)
    });
  }

  // --- GIẢI MÃ TOKEN (LẤY USERNAME & ROLE) ---
  decodeToken(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Lấy thông tin Username/Email để so sánh
        this.currentUserInfo = {
          username: payload.sub || payload.username || '',
          email: payload.email || ''
        };

        // Kiểm tra quyền Admin
        const roles = payload.role || payload.roles || payload.authorities || '';
        if (String(roles).toUpperCase().includes('ADMIN')) {
          this.isAdmin = true;
          console.log('Đã đăng nhập với quyền Admin.');
        }
      } catch (e) {
        console.error('Lỗi đọc token:', e);
      }
    }
  }

  // --- TẢI DANH SÁCH COMMENT ---
  loadBookComments(bookId: number): void {
    const myUser = this.currentUserInfo?.username ? String(this.currentUserInfo.username).toLowerCase() : '';
    const myEmail = this.currentUserInfo?.email ? String(this.currentUserInfo.email).toLowerCase() : '';

    this.commentService.getCommentsByBook(bookId).subscribe({
      next: (data: any[]) => {
        this.comments = data.map(c => {
          // --- LOGIC NHẬN DIỆN CHỦ SỞ HỮU (FIX LỖI F5) ---
          let isOwner = false;
          
          if (c.user) {
            // Lấy thông tin từ API
            const apiUsername = String(c.user.username || c.user.sub || '').toLowerCase();
            const apiEmail = String(c.user.email || '').toLowerCase();
            
            // So sánh Username HOẶC Email
            if (myUser && apiUsername && myUser === apiUsername) {
              isOwner = true;
            } else if (myEmail && apiEmail && myEmail === apiEmail) {
              isOwner = true;
            }
          }

          // Quyền xóa: Admin HOẶC Chủ sở hữu
          const canDelete = this.isAdmin || isOwner;

          return {
            id: c.id,
            // Tên hiển thị: Ưu tiên Fullname -> Username -> "Người dùng"
            user: c.user ? (c.user.fullname || c.user.username || 'Người dùng') : 'Ẩn danh',
            rating: c.star,
            content: c.content,
            date: c.createdDate ? new Date(c.createdDate) : new Date(),
            isCurrentUser: canDelete // Biến này quyết định hiển thị nút xóa
          };
        });

        // Sắp xếp: Mới nhất lên đầu
        this.comments.sort((a, b) => b.date.getTime() - a.date.getTime());
      },
      error: (err) => console.error('Lỗi tải bình luận:', err)
    });
  }

  // --- XÓA BÌNH LUẬN ---
  deleteComment(comment: any): void {
    if (!confirm('Bạn có chắc muốn xóa bình luận này không?')) return;

    if (comment.id) {
      // Ưu tiên dùng API Admin nếu đang là Admin (xóa được tất cả)
      if (this.isAdmin) {
        this.commentService.deleteCommentByAdmin(comment.id).subscribe({
          next: () => {
            // CẬP NHẬT GIAO DIỆN: Lọc bỏ comment có id vừa xóa
            this.comments = this.comments.filter(c => c.id !== comment.id);
            alert('Đã xóa bình luận (Admin).');
          },
          error: (err) => {
            // Nếu lỗi (ví dụ không phải admin thật), thử xóa bằng API thường
            this.retryDeleteAsUser(comment);
          }
        });
      } else {
        // Nếu là User thường
        this.retryDeleteAsUser(comment);
      }
    }
  }

  // Hàm phụ để xóa với quyền User
  retryDeleteAsUser(comment: any): void {
    this.commentService.deleteComment(comment.id).subscribe({
      next: () => {
        // CẬP NHẬT GIAO DIỆN: Lọc bỏ comment có id vừa xóa
        this.comments = this.comments.filter(c => c.id !== comment.id);
        alert('Đã xóa bình luận.');
      },
      error: (err) => alert('Không thể xóa: ' + (err.error?.message || 'Lỗi server'))
    });
  }

  // --- GỬI ĐÁNH GIÁ (BÌNH LUẬN MỚI) ---
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
          
          // Hiển thị ngay lập tức (isCurrentUser = true vì mới tạo)
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

  // --- CÁC HÀM KHÁC (BOOKMARK, SEARCH...) ---

  loadUserBookmarks(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.filteredBooks = [...this.books];
      return;
    }
    this.bookmarkService.getBookmarks().subscribe({
      next: (bookmarks: any[]) => {
        this.myBookmarks = bookmarks;
        this.books.forEach(book => {
          const isBookmarked = this.myBookmarks.some(bm => bm.book.id === book.id);
          book.isFavorite = isBookmarked;
        });
        this.filteredBooks = [...this.books];
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

  onSearch(): void {
    this.selectedBook = null;
    const name = this.searchName.toLowerCase().trim();
    const author = this.searchAuthor.toLowerCase().trim();
    const genre = this.searchGenre.toLowerCase().trim();

    this.filteredBooks = this.books.filter(book => {
      const matchName = book.name.toLowerCase().includes(name);
      const matchAuthor = book.author?.fullname?.toLowerCase().includes(author) ?? false;
      const matchGenre = book.genres?.name?.toLowerCase().includes(genre) ?? false;
      return matchName && matchAuthor && matchGenre;
    });
  }

  resetSearch(): void {
    this.searchName = '';
    this.searchAuthor = '';
    this.searchGenre = '';
    this.filteredBooks = [...this.books];
    this.selectedBook = null;
  }
}