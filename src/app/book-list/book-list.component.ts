import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-book-list',
  templateUrl: './book-list.component.html',
  styleUrls: ['./book-list.component.css']
})
export class BookListComponent implements OnInit {
  books: any[] = [];
  filteredBooks: any[] = [];
  selectedBook: any = null;

  // Biến tìm kiếm
  searchName: string = '';
  searchAuthor: string = '';
  searchGenre: string = '';

  // --- LOGIC ĐÁNH GIÁ (REVIEW) ---
  showReviewModal: boolean = false;
  tempRating: number = 0;
  tempHoverRating: number = 0;
  tempComment: string = '';

  comments: any[] = []; 

  constructor(private bookService: BookService, private router: Router) { }

  ngOnInit(): void {
    this.bookService.getBooks().subscribe({
      next: (data) => {
        this.books = data.map((b: any) => ({ ...b, isFavorite: false }));
        this.filteredBooks = this.books;
      },
      error: (err) => console.error(err)
    });
  }

  // --- TÌM KIẾM ---
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
    
    // Giả lập comment: 1 cái của người khác, 1 cái của mình (isCurrentUser: true)
    this.comments = [
      { 
        user: 'Nguyễn Văn A', 
        rating: 5, 
        content: 'Sách rất hay, cốt truyện lôi cuốn!', 
        date: new Date('2023-10-15'),
        isCurrentUser: false // Không được xóa
      },
      { 
        user: 'Tôi (Bạn)', 
        rating: 4, 
        content: 'Giao hàng nhanh, sách đẹp nhưng nội dung đoạn giữa hơi chán.', 
        date: new Date(),
        isCurrentUser: true // Được phép xóa
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

  toggleFavorite(event: Event, book: any): void {
    event.stopPropagation();
    book.isFavorite = !book.isFavorite;
  }

  // --- MODAL ĐÁNH GIÁ ---
  openReviewForm(): void {
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

  submitReview(): void {
    if (this.tempRating === 0) {
      alert('Vui lòng chọn số sao đánh giá!');
      return;
    }
    
    const newReview = {
      user: 'Tôi (Bạn)', 
      rating: this.tempRating,
      content: this.tempComment || 'Không có lời bình.',
      date: new Date(),
      isCurrentUser: true // Đánh dấu là comment của mình
    };

    this.comments.unshift(newReview);
    this.closeReviewForm();
  }

  // --- XÓA BÌNH LUẬN ---
  deleteComment(comment: any): void {
    const confirmDelete = confirm('Bạn có chắc muốn xóa bình luận này không?');
    if (confirmDelete) {
      // Lọc bỏ comment cần xóa ra khỏi danh sách
      this.comments = this.comments.filter(c => c !== comment);
      
      // TODO: Gọi API xóa comment thực tế tại đây
      // this.commentService.delete(comment.id)...
    }
  }
}