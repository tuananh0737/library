import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';


interface Genre {
  id: number;
  name: string;
  details: string;
}

@Component({
  selector: 'app-genre',
  templateUrl: './genre.component.html',
  styleUrls: ['./genre.component.css']
})
export class GenreComponent implements OnInit {
  genres: Genre[] = [];
  paginatedGenres: Genre[] = [];
  currentGenre: Genre = { id: 0, name: '', details: '' };
  selectGenre: Genre | null = null;

  showGenreForm: boolean = false;
  showDeleteConfirm: boolean = false;
  isEditing: boolean = false;
  deleteSuccessful: boolean = false;
  updateSuccessful: boolean = false;

  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  searchQuery: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadGenres();
  }

  loadGenres(): void {
    const url = `${environment.apiUrl}/public/find-all-genres`;
    this.http.get<Genre[]>(url).subscribe({
      next: (data) => {
        this.genres = data;
        this.filterAndPaginate();
      },
      error: (err) => console.error('Lỗi khi tải danh sách thể loại:', err),
    });
  }

  filterAndPaginate(): void {
    const filtered = this.searchQuery
      ? this.genres.filter((genre) =>
          genre.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      : this.genres;
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedGenres = filtered.slice(startIndex, startIndex + this.pageSize);
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

  openAddGenreForm(): void {
    this.currentGenre = { id: 0, name: '', details: '' };
    this.isEditing = false;
    this.showGenreForm = true;
  }

  openEditGenreForm(genre: Genre): void {
    this.currentGenre = { ...genre };
    this.isEditing = true;
    this.showGenreForm = true;
  }

  closeGenreForm(): void {
    this.showGenreForm = false;
  }

  saveGenre(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Bạn chưa đăng nhập!');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const url = `${environment.apiUrl}/admin/add-update-genres`;

    this.http.post<Genre>(url, this.currentGenre, { headers }).subscribe({
      next: (response) => {
        if (this.isEditing) {
          const index = this.genres.findIndex((g) => g.id === response.id);
          if (index !== -1) this.genres[index] = response;
        } else {
          this.genres.push(response);
        }
        this.closeGenreForm();
        this.filterAndPaginate();
        this.updateSuccessful = true;
      },
      error: (err) => {
        console.error('Lỗi khi lưu tác giả:', err);
        alert('Đã xảy ra lỗi khi lưu tác giả.');
      },
    });
  }

  openDeleteConfirm(genreId: number): void {
    this.selectGenre = this.genres.find(genre => genre.id === genreId) || null;
    this.showDeleteConfirm = true;
  }

  deleteGenre(genreId: number): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Bạn chưa đăng nhập!');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const url = `${environment.apiUrl}/admin/delete-genres?id=${genreId}`;

    this.http.delete(url, { headers }).subscribe({
      next: () => {
        this.genres = this.genres.filter((g) => g.id !== genreId);
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
    if (this.selectGenre) this.deleteGenre(this.selectGenre.id);
    this.cancel();
  }

  cancel(): void {
    this.showDeleteConfirm = false;
    this.deleteSuccessful = false;
    this.updateSuccessful = false;
  }
}
