import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


interface Author {
  id: number;
  fullname: string;
  birthDay: string;
  nationality: string;
}

@Component({
  selector: 'app-author',
  templateUrl: './author.component.html',
  styleUrls: ['./author.component.css']
})
export class AuthorComponent implements OnInit {
  authors: Author[] = [];
  paginatedAuthors: Author[] = [];
  currentAuthor: Author = { id: 0, fullname: '', birthDay: '', nationality: '' };
  selectAuthor: Author | null = null;

  showAuthorForm: boolean = false;
  isEditing: boolean = false;
  showDeleteConfirm: boolean = false;
  deleteSuccessful: boolean = false;
  updateSuccessful: boolean = false;

  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  searchQuery: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAuthors();
  }

  loadAuthors(): void {
    const url = `${environment.apiUrl}/public/find-all-author`;
    this.http.get<Author[]>(url).subscribe({
      next: (data) => {
        this.authors = data;
        this.filterAndPaginate();
      },
      error: (err) => console.error('Lỗi khi tải danh sách tác giả:', err),
    });
  }

  filterAndPaginate(): void {
    const filtered = this.searchQuery
      ? this.authors.filter((author) =>
          author.fullname.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      : this.authors;
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedAuthors = filtered.slice(startIndex, startIndex + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.filterAndPaginate();
  }

  performSearch(): void {
    this.currentPage = 1;
    this.filterAndPaginate();
  }

  openAddAuthorForm(): void {
    this.currentAuthor = { id: 0, fullname: '', birthDay: '', nationality: '' };
    this.isEditing = false;
    this.showAuthorForm = true;
  }

  openEditAuthorForm(author: Author): void {
    this.currentAuthor = { ...author };
    this.isEditing = true;
    this.showAuthorForm = true;
  }

  closeAuthorForm(): void {
    this.showAuthorForm = false;
  }

  saveAuthor(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Bạn chưa đăng nhập!');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const url = `${environment.apiUrl}/admin/add-update-author`;

    this.http.post<Author>(url, this.currentAuthor, { headers }).subscribe({
      next: (response) => {
        if (this.isEditing) {
          const index = this.authors.findIndex((a) => a.id === response.id);
          if (index !== -1) this.authors[index] = response;
        } else {
          this.authors.push(response);
        }
        this.closeAuthorForm();
        this.filterAndPaginate();
        this.updateSuccessful = true;
      },
      error: (err) => {
        console.error('Lỗi khi lưu tác giả:', err);
        alert('Đã xảy ra lỗi khi lưu tác giả.');
      },
    });
  }

  openDeleteConfirm(authorId: number): void {
    this.selectAuthor = this.authors.find(author => author.id === authorId) || null;
    this.showDeleteConfirm = true;
  }
  

  deleteAuthor(authorId: number): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Bạn chưa đăng nhập!');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const url = `${environment.apiUrl}/admin/delete-author?id=${authorId}`;

    this.http.delete(url, { headers }).subscribe({
      next: () => {
        this.authors = this.authors.filter((a) => a.id !== authorId);
        this.filterAndPaginate();
        this.deleteSuccessful = true;
      },
      error: (err) => {
        console.error('Lỗi khi xóa tác giả:', err);
        alert('Đã xảy ra lỗi khi xóa tác giả.');
      },
    });
  }

  confirmDelete(): void {
    if (this.selectAuthor) this.deleteAuthor(this.selectAuthor.id);
    this.cancel();
  }

  cancel(): void {
    this.showDeleteConfirm = false;
    this.deleteSuccessful = false;
    this.updateSuccessful = false;
  }
}
