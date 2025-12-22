import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

// QUAN TRỌNG: Đăng ký modules cho Chart.js để tránh lỗi
Chart.register(...registerables);

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.css']
})
export class AdminHomeComponent implements OnInit, AfterViewInit {
  statistics: any; // Thống kê tổng quan
  monthlyStatistics: string = ''; 
  selectedMonth: number = new Date().getMonth() + 1; 
  selectedYear: number = new Date().getFullYear(); 
  borrowStatusChart: any = null; 
  allMonthlyStatistics: { [month: number]: string } = {}; 

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.loadMonthlyStatistics();
    this.loadAllMonthlyStatistics();
  }

  loadMonthlyStatistics(): void {
    this.http
      .get(`/api/admin/statistics-monthly?month=${this.selectedMonth}&year=${this.selectedYear}`, { responseType: 'text' })
      .subscribe({
        next: (data: string) => {
          this.monthlyStatistics = data;
        }, 
        error: (error) => {
          console.error('Error fetching monthly statistics:', error);
          this.monthlyStatistics = ''; // Xóa dữ liệu cũ nếu lỗi
        }
      });
  }

  onMonthYearChange(): void {
    this.loadMonthlyStatistics();
  }

  ngAfterViewInit(): void {
    // Logic vẽ chart sẽ được gọi trong loadStatistics khi có data
  }

  loadStatistics(): void {
    this.http.get('/api/admin/dashboard-statistics')
      .subscribe({
        next: (data: any) => {
          this.statistics = data;
          this.createBorrowStatusChart(); 
        }, 
        error: (error) => {
          console.error('Error fetching statistics:', error);
        }
      });
  }

  createBorrowStatusChart(): void {
    const ctx = document.getElementById('borrowStatusChart') as HTMLCanvasElement;

    if (!ctx) {
      return;
    }

    if (this.borrowStatusChart) {
      this.borrowStatusChart.destroy();
    }

    this.borrowStatusChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Trả đúng hạn', 'Trả quá hạn', 'Chưa trả'],
        datasets: [{
          data: [
            this.statistics?.returnedOnTime || 0,
            this.statistics?.returnedLate || 0,
            this.statistics?.notReturned || 0
          ],
          // Màu sắc hiện đại hơn
          backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'], 
          hoverBackgroundColor: ['#16a34a', '#d97706', '#dc2626'],
          borderWidth: 0 // Bỏ viền cho phẳng
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Để canvas co giãn theo thẻ cha
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
                usePointStyle: true,
                padding: 20
            }
          }
        }
      }
    });
  }

  loadAllMonthlyStatistics(): void {
    for (let month = 1; month <= 12; month++) {
      this.http
        .get(`/api/admin/statistics-monthly?month=${month}&year=${this.selectedYear}`, { responseType: 'text' })
        .subscribe({
          next: (data: string) => {
            this.allMonthlyStatistics[month] = data;
          },
          error: (error) => {
            console.error(`Error fetching data for month ${month}:`, error);
            this.allMonthlyStatistics[month] = 'Không có dữ liệu';
          }
        });
    }
  }

  onYearChange(): void {
    this.allMonthlyStatistics = {}; 
    this.loadAllMonthlyStatistics();
  }
}