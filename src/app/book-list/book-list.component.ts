import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { BookmarkService } from '../services/bookmark.service'; // Import Service từ Connect
import { CommentService } from '../services/comment.service';   // Import Service từ Connect
import { Router } from '@angular/router';

@Component({
  selector: 'app-book-list',
  templateUrl: './book-list.component.html',
  styleUrls: ['./book-list.component.css']
})
export class BookListComponent implements OnInit {
  // --- Dữ liệu sách ---
  books: any[] = [];
  filteredBooks: any[] = [];
  selectedBook: any = null;
  
  // --- Dữ liệu Bookmark (để xử lý logic yêu thích) ---
  myBookmarks: any[] = [];

  // --- Biến tìm kiếm (Khớp với HTML) ---
  searchName: string = '';
  searchAuthor: string = '';
  searchGenre: string = '';

  // --- LOGIC ĐÁNH GIÁ (REVIEW) ---
  showReviewModal: boolean = false;
  tempRating: number = 0;
  tempHoverRating: number = 0;
  tempComment: string = '';
  comments: any[] = []; 

  constructor(
    private bookService: BookService,
    private bookmarkService: BookmarkService, // Inject Service
    private commentService: CommentService,   // Inject Service
    private router: Router
  ) { }

  ngOnInit(): void {
    // 1. Tải danh sách sách
    this.bookService.getBooks().subscribe({
      next: (data) => {
        this.books = data.map((b: any) => ({ ...b, isFavorite: false }));
        // 2. Sau khi có sách, tải danh sách Bookmark để map trạng thái yêu thích
        this.loadUserBookmarks();
      },
      error: (err) => console.error('Lỗi tải sách:', err)
    });
  }

  // --- TẢI & XỬ LÝ BOOKMARK ---
  loadUserBookmarks(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.filteredBooks = [...this.books];
      return;
    }

    this.bookmarkService.getBookmarks().subscribe({
      next: (bookmarks: any[]) => {
        this.myBookmarks = bookmarks;
        // Cập nhật trạng thái isFavorite cho từng cuốn sách
        this.books.forEach(book => {
          // Kiểm tra xem sách này có trong list bookmark không
          const isBookmarked = this.myBookmarks.some(bm => bm.book.id === book.id);
          book.isFavorite = isBookmarked;
        });
        this.filteredBooks = [...this.books]; // Cập nhật lại danh sách hiển thị
        
        // Nếu đang mở chi tiết sách, cập nhật lại trạng thái sách đó
        if (this.selectedBook) {
          const updatedBook = this.books.find(b => b.id === this.selectedBook.id);
          if (updatedBook) this.selectedBook.isFavorite = updatedBook.isFavorite;
        }
      },
      error: (err) => console.error('Lỗi tải bookmark:', err)
    });
  }

  // --- TÌM KIẾM (Giữ nguyên logic Library) ---
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

  // --- GIAO DIỆN CHÍNH ---
  onSelectBook(book: any): void {
    this.selectedBook = book;
    
    // Giả lập comment hiển thị tạm thời (Vì API find-all-book chưa chắc trả về comment)
    // Bạn có thể gọi thêm API lấy comment theo sách ở đây nếu backend hỗ trợ
    this.comments = [
      { 
        user: 'Người dùng khác', 
        rating: 5, 
        content: 'Sách rất hay, cốt truyện lôi cuốn!', 
        date: new Date('2023-10-15'),
        isCurrentUser: false 
      }
    ];
  }

  closeDetail(): void {
    this.selectedBook = null;
    this.showReviewModal = false;
  }

  onBorrow(bookId: number): void {
    this.router.navigate(['/borrow'], { queryParams: { bookId: bookId } });
  }

  // --- XỬ LÝ YÊU THÍCH (Kết nối API) ---
  toggleFavorite(event: Event, book: any): void {
    event.stopPropagation();

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Bạn cần đăng nhập để thực hiện chức năng này!');
      return;
    }

    if (book.isFavorite) {
      // Logic XÓA Bookmark
      // Cần tìm bookmarkId tương ứng với bookId này
      const bookmarkEntry = this.myBookmarks.find(bm => bm.book.id === book.id);
      
      if (bookmarkEntry) {
        this.bookmarkService.deleteBookmark(bookmarkEntry.id).subscribe({
          next: () => {
            book.isFavorite = false;
            this.loadUserBookmarks(); // Tải lại danh sách để đồng bộ
            alert('Đã xóa khỏi danh sách yêu thích.');
          },
          error: (err) => alert('Lỗi khi xóa bookmark: ' + (err.error?.message || err.message))
        });
      }
    } else {
      // Logic THÊM Bookmark
      this.bookmarkService.addBookmark(book.id).subscribe({
        next: () => {
          book.isFavorite = true;
          this.loadUserBookmarks(); // Tải lại danh sách để đồng bộ
          alert('Đã thêm vào danh sách yêu thích.');
        },
        error: (err) => alert('Lỗi khi thêm bookmark: ' + (err.error?.message || err.message))
      });
    }
  }

  // --- MODAL ĐÁNH GIÁ ---
  openReviewForm(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Vui lòng đăng nhập để bình luận!');
      return;
    }
    this.showReviewModal = true;
    this.tempRating = 5;
    this.tempComment = '';
  }

  closeReviewForm(): void {
    this.showReviewModal = false;
  }

  setRating(star: number): void {
    this.tempRating = star;
  }

  // --- GỬI ĐÁNH GIÁ (Kết nối API) ---
  submitReview(): void {
    if (this.tempRating === 0) {
      alert('Vui lòng chọn số sao đánh giá!');
      return;
    }
    
    // Gọi API add-comment từ Connect
    this.commentService.addComment(this.tempComment, this.tempRating, this.selectedBook.id)
      .subscribe({
        next: () => {
          alert('Gửi đánh giá thành công!');
          
          // Thêm comment mới vào danh sách hiển thị tạm thời
          const newReview = {
            user: 'Tôi (Bạn)', 
            rating: this.tempRating,
            content: this.tempComment,
            date: new Date(),
            isCurrentUser: true // Đánh dấu là của mình để hiện nút xóa
          };
          this.comments.unshift(newReview);
          
          this.closeReviewForm();
        },
        error: (err) => {
          console.error(err);
          alert('Lỗi gửi bình luận: ' + (err.error?.message || 'Vui lòng thử lại'));
        }
      });
  }

  // --- XÓA BÌNH LUẬN (Kết nối API) ---
  deleteComment(comment: any): void {
    // Lưu ý: Comment giả lập thì không có ID để xóa qua API
    // Nếu comment được tải từ API về thì sẽ có ID.
    const confirmDelete = confirm('Bạn có chắc muốn xóa bình luận này không?');
    if (confirmDelete) {
      if (comment.id) {
         // Nếu comment có ID (từ API), gọi API xóa
         this.commentService.deleteComment(comment.id).subscribe({
           next: () => {
             this.comments = this.comments.filter(c => c !== comment);
             alert('Đã xóa bình luận.');
           },
           error: (err) => alert('Không thể xóa: ' + err.message)
         });
      } else {
         // Nếu là comment mới thêm (chưa reload trang để có ID), chỉ xóa trên giao diện
         this.comments = this.comments.filter(c => c !== comment);
      }
    }
  }
}