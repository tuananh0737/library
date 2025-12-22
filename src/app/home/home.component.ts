import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { BookmarkService } from '../services/bookmark.service';
import { CommentService } from '../services/comment.service'; // Import Service
import { Router } from '@angular/router';

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
  
  // --- Biến Tìm kiếm ---
  searchQuery: string = '';
  activeCategory: string = 'All';
  categories = ['All', 'Kinh dị', 'Khoa học', 'Văn học', 'Lịch sử', 'Công nghệ', 'Tiểu thuyết'];

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
    private commentService: CommentService, // Inject CommentService
    private router: Router
  ) { }

  ngOnInit(): void {
    // 1. Giải mã Token để lấy thông tin User & Quyền Admin
    this.decodeToken();

    // 2. Tải danh sách sách
    this.bookService.getBooks().subscribe({
      next: (data) => {
        // Map mặc định isFavorite là false
        this.books = data.map((b: any) => ({ ...b, isFavorite: false }));
        this.filteredBooks = this.books;
        
        // Mặc định chọn cuốn đầu tiên
        if (this.books.length > 0) {
          this.onSelectBook(this.books[0]);
        }

        // 3. Sau đó tải bookmark để cập nhật trạng thái
        this.loadUserBookmarks();
      },
      error: (err) => console.error(err)
    });
  }

  // --- GIẢI MÃ TOKEN (LẤY USERNAME & ROLE) ---
  decodeToken(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Lấy thông tin Username/Email để so sánh quyền xóa comment
        this.currentUserInfo = {
          username: payload.sub || payload.username || '',
          email: payload.email || ''
        };

        // Kiểm tra quyền Admin
        const roles = payload.role || payload.roles || payload.authorities || '';
        if (String(roles).toUpperCase().includes('ADMIN')) {
          this.isAdmin = true;
        }
      } catch (e) {
        console.error('Lỗi đọc token:', e);
      }
    }
  }

  // --- LOGIC LOAD BOOKMARK ---
  loadUserBookmarks(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return; 

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

  // --- TẢI DANH SÁCH COMMENT ---
  loadBookComments(bookId: number): void {
    const myUser = this.currentUserInfo?.username ? String(this.currentUserInfo.username).toLowerCase() : '';
    const myEmail = this.currentUserInfo?.email ? String(this.currentUserInfo.email).toLowerCase() : '';

    this.commentService.getCommentsByBook(bookId).subscribe({
      next: (data: any[]) => {
        this.comments = data.map(c => {
          // Logic nhận diện chủ sở hữu
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

          // Quyền xóa: Admin HOẶC Chủ sở hữu
          const canDelete = this.isAdmin || isOwner;

          return {
            id: c.id,
            user: c.user ? (c.user.fullname || c.user.username || 'Người dùng') : 'Ẩn danh',
            rating: c.star,
            content: c.content,
            date: c.createdDate ? new Date(c.createdDate) : new Date(),
            isCurrentUser: canDelete // Biến quyết định hiển thị nút xóa
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
      if (this.isAdmin) {
        this.commentService.deleteCommentByAdmin(comment.id).subscribe({
          next: () => {
            // Lọc bỏ theo ID để cập nhật giao diện ngay
            this.comments = this.comments.filter(c => c.id !== comment.id);
            alert('Đã xóa bình luận (Admin).');
          },
          error: (err) => {
            this.retryDeleteAsUser(comment);
          }
        });
      } else {
        this.retryDeleteAsUser(comment);
      }
    }
  }

  retryDeleteAsUser(comment: any): void {
    this.commentService.deleteComment(comment.id).subscribe({
      next: () => {
        // Lọc bỏ theo ID để cập nhật giao diện ngay
        this.comments = this.comments.filter(c => c.id !== comment.id);
        alert('Đã xóa bình luận.');
      },
      error: (err) => alert('Không thể xóa: ' + (err.error?.message || 'Lỗi server'))
    });
  }

  // --- GỬI ĐÁNH GIÁ MỚI ---
  submitReview(): void {
    if (this.tempRating === 0) {
      alert('Vui lòng chọn số sao!');
      return;
    }

    const rating = this.tempRating;
    const content = this.tempComment;

    this.commentService.addComment(content, rating, this.selectedBook.id)
      .subscribe({
        next: (response: any) => {
          alert('Cảm ơn bạn đã đánh giá!');
          
          // Thêm comment mới vào đầu danh sách hiển thị
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

  // --- LOGIC TOGGLE FAVORITE ---
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

  // --- CÁC LOGIC KHÁC ---
  onSearch() { this.applyFilters(); }
  
  filterCategory(cat: string) {
    this.activeCategory = cat;
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
  }

  onSelectBook(book: any): void {
    this.selectedBook = book;
    this.comments = []; // Reset comment cũ
    this.loadBookComments(book.id); // Tải comment thật
  }

  borrowBook(bookId: number) {
      this.router.navigate(['/borrow'], { queryParams: { bookId: bookId } });
  }

  openReviewForm(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Vui lòng đăng nhập để đánh giá!');
      return;
    }
    this.showReviewModal = true;
    this.tempRating = 0;
    this.tempComment = '';
  }

  closeReviewForm(): void { this.showReviewModal = false; }
  setRating(star: number): void { this.tempRating = star; }
}