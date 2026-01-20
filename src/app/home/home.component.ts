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

  // --- Đánh giá & Bình luận ---
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

        if (this.books.length > 0) {
          this.onSelectBook(this.books[0]);
        }
        this.loadUserBookmarks();
      },
      error: (err) => console.error(err)
    });
  }

  // --- LOGIC TOKEN & USER ---
  decodeToken(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUserInfo = {
          id: payload.id || payload.userId, // Lấy ID để so sánh quyền xóa
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

  // --- LOGIC BÌNH LUẬN (Đã sửa đổi) ---
  loadBookComments(bookId: number): void {
    const currentUserId = this.currentUserInfo?.id;

    this.commentService.getCommentsByBook(bookId).subscribe({
      next: (data: any[]) => {
        this.comments = data.map(c => {
          let isOwner = false;
          
          // Kiểm tra quyền sở hữu dựa trên ID
          if (c.user && currentUserId) {
             // Nếu user là object có id
             if (c.user.id && c.user.id === currentUserId) isOwner = true;
             // Dự phòng nếu user chỉ là id (number)
             else if (typeof c.user === 'number' && c.user === currentUserId) isOwner = true;
          }

          const hasRealPermission = this.isAdmin || isOwner;

          return {
            id: c.id,
            // Hiển thị tên người dùng an toàn
            user: c.user ? (c.user.fullname || c.user.username || 'Người dùng') : 'Ẩn danh',
            rating: c.star,
            content: c.content,
            date: c.createdDate ? new Date(c.createdDate) : new Date(),
            
            isCurrentUser: true,        // Luôn hiện nút xóa
            canDelete: hasRealPermission // Cờ kiểm tra quyền thực sự
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
    
    // Chọn API xóa phù hợp
    const deleteObs = this.isAdmin 
        ? this.commentService.deleteCommentByAdmin(comment.id)
        : this.commentService.deleteComment(comment.id);

    deleteObs.subscribe({
        next: () => {
            this.comments = this.comments.filter(c => c.id !== comment.id);
            alert('Đã xóa bình luận.');
        },
        error: (err) => alert('Lỗi xóa bình luận: ' + (err.error?.message || 'Lỗi server'))
    });
  }

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
          // Tải lại comment để đồng bộ ID và thông tin từ server
          this.loadBookComments(this.selectedBook.id);
          this.closeReviewForm();
        },
        error: (err) => {
          console.error(err);
          alert('Lỗi gửi bình luận: ' + (err.error?.message || 'Vui lòng thử lại'));
        }
      });
  }

  // --- LOGIC PHÂN TRANG ---
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
        
        this.filteredBooks = [...this.books]; 
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