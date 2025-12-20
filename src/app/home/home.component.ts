import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
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
  
  searchQuery: string = '';
  activeCategory: string = 'All';
  categories = ['All', 'Kinh dị', 'Khoa học', 'Văn học', 'Lịch sử', 'Công nghệ', 'Tiểu thuyết'];

  // --- LOGIC ĐÁNH GIÁ & BÌNH LUẬN ---
  showReviewModal: boolean = false;
  tempRating: number = 0;
  tempHoverRating: number = 0;
  tempComment: string = '';
  comments: any[] = [];

  constructor(private bookService: BookService, private router: Router) { }

  ngOnInit(): void {
    this.bookService.getBooks().subscribe({
      next: (data) => {
        // Map thêm thuộc tính isFavorite
        this.books = data.map((b: any) => ({ ...b, isFavorite: false }));
        this.filteredBooks = this.books;
        
        // Mặc định chọn cuốn đầu tiên
        if (this.books.length > 0) {
          this.onSelectBook(this.books[0]);
        }
      },
      error: (err) => console.error(err)
    });
  }

  // --- LOGIC LỌC & TÌM KIẾM ---
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

  // --- LOGIC GIAO DIỆN CHÍNH ---
  onSelectBook(book: any): void {
    this.selectedBook = book;
    
    // Giả lập comment cho từng sách
    this.comments = [
      { 
        user: 'Trần Văn C', 
        rating: 5, 
        content: 'Cuốn sách này thay đổi tư duy của tôi.', 
        date: new Date('2023-11-20'),
        isCurrentUser: false 
      },
      { 
        user: 'Tôi (Bạn)', 
        rating: 4, 
        content: 'Đọc khá ổn, nhưng phần cuối hơi vội.', 
        date: new Date(),
        isCurrentUser: true // Cho phép xóa
      }
    ];
  }

  borrowBook(bookId: number) {
      this.router.navigate(['/borrow'], { queryParams: { bookId: bookId } });
  }

  toggleFavorite(event: Event, book: any): void {
    event.stopPropagation(); // Ngăn click vào card
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
      alert('Vui lòng chọn số sao!');
      return;
    }
    const newReview = {
      user: 'Tôi (Bạn)', 
      rating: this.tempRating,
      content: this.tempComment || 'Không có lời bình.',
      date: new Date(),
      isCurrentUser: true
    };
    this.comments.unshift(newReview);
    this.closeReviewForm();
  }

  // --- XÓA BÌNH LUẬN ---
  deleteComment(comment: any): void {
    const confirmDelete = confirm('Bạn có chắc muốn xóa bình luận này?');
    if (confirmDelete) {
      this.comments = this.comments.filter(c => c !== comment);
    }
  }
}