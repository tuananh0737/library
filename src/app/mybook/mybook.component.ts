import { Component, OnInit } from '@angular/core';
import { BookmarkService } from '../services/bookmark.service'; // [Mới] Import Service

@Component({
  selector: 'app-mybook',
  templateUrl: './mybook.component.html',
  styleUrls: ['./mybook.component.css']
})
export class MybookComponent implements OnInit {
  bookmarks: any[] = [];
  errorMessage: string = '';
  isDeleteOverlayVisible: boolean = false;
  selectedBookmark: any = null; 

  // [Cập nhật] Inject BookmarkService thay vì HttpClient
  constructor(private bookmarkService: BookmarkService) {}

  ngOnInit(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      this.fetchBookmarks();
    } else {
      this.errorMessage = 'Đăng nhập để tiếp tục.';
    }
  }

  // [Cập nhật] Sử dụng service để lấy danh sách
  fetchBookmarks(): void {
    this.bookmarkService.getBookmarks().subscribe({
      next: (response: any) => {
        this.bookmarks = response;
      },
      error: (error) => {
        this.errorMessage = error.error?.errorMessage || 'Lỗi khi tải danh sách';
        console.error('Error:', error);
      }
    });
  }

  openDeleteOverlay(bookmark: any): void {
    this.selectedBookmark = bookmark; 
    this.isDeleteOverlayVisible = true;
  }

  closeDeleteOverlay(): void {
    this.isDeleteOverlayVisible = false; 
    this.selectedBookmark = null; 
  }

  // [Cập nhật] Sử dụng service để xóa
  deleteBook(bookmarkId: number): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.errorMessage = 'Bạn cần đăng nhập lại.';
      return;
    }

    this.bookmarkService.deleteBookmark(bookmarkId).subscribe({
      next: () => {
        // Cập nhật lại giao diện sau khi xóa thành công
        this.bookmarks = this.bookmarks.filter(b => b.id !== bookmarkId); 
        this.closeDeleteOverlay(); 
        alert('Đã xóa khỏi danh sách yêu thích.');
      },
      error: (error) => {
        this.errorMessage = error.error?.errorMessage || 'Lỗi khi xóa mục yêu thích';
        console.error('Error:', error);
      }
    });
  }
}