import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-ebook',
  templateUrl: './ebook.component.html',
  styleUrls: ['./ebook.component.css']
})

export class EbookComponent {
  searchQuery: string = '';
  books: any[] = [];
  loading: boolean = false;

  private searchSubject = new Subject<string>();

  constructor(private http: HttpClient) {
    this.searchSubject.pipe(debounceTime(500)).subscribe((query) => {
      this.fetchBooks(query);
    });
  }

  onSearchQueryChange(query: string) {
    this.searchSubject.next(query);
  }

  fetchBooks(query: string) {
    if (!query.trim()) {
      alert('Vui lòng nhập từ khóa tìm kiếm!');
      return;
    }

    this.loading = true;

    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
    this.http.get(apiUrl).subscribe(
      (response: any) => {
        this.books = (response.items || []).map((item: any) => ({
          title: item.volumeInfo.title || 'Không rõ',
          author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Không rõ',
          coverId: item.volumeInfo.imageLinks?.thumbnail || null,
          previewLink: item.volumeInfo.previewLink || null,
        }));
        this.loading = false;
      },
      (error) => {
        this.handleError(error);
      }
    );
  }

  handleError(error: any) {
    this.loading = false;
    if (error.status === 429) {
      alert('Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau!');
    } else {
      alert('Đã xảy ra lỗi. Vui lòng thử lại!');
    }
  }
}
