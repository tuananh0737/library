import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { BookmarkService } from '../services/bookmark.service'; // Import Service
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
  myBookmarks: any[] = []; // [Mới] Biến lưu danh sách bookmark giống BookList
  
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

  constructor(
    private bookService: BookService, 
    private bookmarkService: BookmarkService, // Inject Service
    private router: Router
  ) { }

  ngOnInit(): void {
    // 1. Tải danh sách sách trước
    this.bookService.getBooks().subscribe({
      next: (data) => {
        // Map mặc định isFavorite là false
        this.books = data.map((b: any) => ({ ...b, isFavorite: false }));
        this.filteredBooks = this.books;
        
        // Mặc định chọn cuốn đầu tiên
        if (this.books.length > 0) {
          this.onSelectBook(this.books[0]);
        }

        // 2. Sau đó tải bookmark để cập nhật trạng thái (Logic từ BookList)
        this.loadUserBookmarks();
      },
      error: (err) => console.error(err)
    });
  }

  // --- LOGIC LOAD BOOKMARK (GIỐNG BOOK-LIST) ---
  loadUserBookmarks(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return; // Nếu chưa đăng nhập thì thôi

    this.bookmarkService.getBookmarks().subscribe({
      next: (bookmarks: any[]) => {
        this.myBookmarks = bookmarks;
        
        // Duyệt qua sách để đánh dấu trái tim
        this.books.forEach(book => {
          const isBookmarked = this.myBookmarks.some(bm => bm.book.id === book.id);
          book.isFavorite = isBookmarked;
        });

        // Cập nhật lại danh sách hiển thị
        this.filteredBooks = [...this.books]; // Trigger change detection
        
        // Cập nhật cả cuốn sách đang được chọn (nếu có)
        if (this.selectedBook) {
          const updatedBook = this.books.find(b => b.id === this.selectedBook.id);
          if (updatedBook) this.selectedBook.isFavorite = updatedBook.isFavorite;
        }
      },
      error: (err) => console.error('Lỗi tải bookmark:', err)
    });
  }

  // --- LOGIC TOGGLE FAVORITE (GIỐNG BOOK-LIST) ---
  toggleFavorite(event: Event, book: any): void {
    event.stopPropagation(); // Ngăn click vào card
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Bạn cần đăng nhập để thực hiện chức năng này!');
      return;
    }

    if (book.isFavorite) {
      // Logic Xóa: Tìm trong mảng myBookmarks để lấy ID của bookmark cần xóa
      const bookmarkEntry = this.myBookmarks.find(bm => bm.book.id === book.id);
      
      if (bookmarkEntry) {
        this.bookmarkService.deleteBookmark(bookmarkEntry.id).subscribe({
          next: () => {
            book.isFavorite = false;
            // Tải lại để đồng bộ mảng myBookmarks
            this.loadUserBookmarks(); 
            alert('Đã xóa khỏi danh sách yêu thích.');
          },
          error: (err) => alert('Lỗi: ' + (err.error?.message || err.message))
        });
      }
    } else {
      // Logic Thêm
      this.bookmarkService.addBookmark(book.id).subscribe({
        next: () => {
          book.isFavorite = true;
          // Tải lại để đồng bộ
          this.loadUserBookmarks(); 
          alert('Đã thêm vào danh sách yêu thích.');
        },
        error: (err) => alert('Lỗi: ' + (err.error?.message || err.message))
      });
    }
  }

  // --- CÁC LOGIC CŨ (GIỮ NGUYÊN) ---
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
    
    // Giả lập comment (Phần này bạn có thể thay bằng API comment thật sau này)
    this.comments = [
      { user: 'Trần Văn C', rating: 5, content: 'Sách hay!', date: new Date(), isCurrentUser: false }
    ];
  }

  borrowBook(bookId: number) {
      this.router.navigate(['/borrow'], { queryParams: { bookId: bookId } });
  }

  // --- MODAL REVIEW (GIỮ NGUYÊN) ---
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
  
  submitReview(): void {
    if (this.tempRating === 0) {
      alert('Vui lòng chọn số sao!');
      return;
    }
    this.closeReviewForm();
    alert('Cảm ơn bạn đã đánh giá!');
  }

  deleteComment(comment: any): void {
  }
}