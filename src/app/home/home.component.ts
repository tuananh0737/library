import { Component, OnInit } from '@angular/core';
import { BookService } from '../services/book.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  books: any[] = [];          // Dữ liệu gốc từ API
  filteredBooks: any[] = [];  // Dữ liệu hiển thị ra màn hình
  selectedBook: any = null;
  
  searchQuery: string = '';
  activeCategory: string = 'All';

  // Danh sách thể loại (Cần khớp với dữ liệu trong database hoặc load từ API)
  categories = ['All', 'Kinh dị', 'Khoa học', 'Văn học', 'Lịch sử', 'Công nghệ', 'Tiểu thuyết'];

  constructor(private bookService: BookService, private router: Router) { }

  ngOnInit(): void {
    this.bookService.getBooks().subscribe({
      next: (data) => {
        this.books = data;
        this.filteredBooks = data; // Ban đầu hiển thị tất cả
        
        // Mặc định chọn cuốn đầu tiên nếu có
        if (this.books.length > 0) {
          this.selectBook(this.books[0]);
        }
      },
      error: (err) => console.error(err)
    });
  }

  selectBook(book: any): void {
    this.selectedBook = book;
  }

  // 1. Hàm xử lý khi người dùng nhập tìm kiếm
  onSearch() {
    this.applyFilters(); 
  }

  // 2. Hàm xử lý khi người dùng chọn thể loại
  filterCategory(cat: string) {
    this.activeCategory = cat;
    this.applyFilters();
  }

  // 3. LOGIC TRUNG TÂM: Kết hợp cả Search và Category
  applyFilters() {
    let tempBooks = [...this.books]; // Copy từ danh sách gốc

    // Bước 1: Lọc theo từ khóa tìm kiếm (nếu có)
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      tempBooks = tempBooks.filter(b => 
        b.name.toLowerCase().includes(query) || 
        b.author?.fullname.toLowerCase().includes(query)
      );
    }

    // Bước 2: Lọc theo thể loại (nếu không phải All)
    if (this.activeCategory !== 'All') {
      tempBooks = tempBooks.filter(b => 
        b.genres?.name && b.genres.name.toLowerCase().includes(this.activeCategory.toLowerCase())
      );
    }

    // Cập nhật danh sách hiển thị
    this.filteredBooks = tempBooks;
  }

  borrowBook(bookId: number) {
      this.router.navigate(['/borrow'], { queryParams: { bookId: bookId } });
  }
}