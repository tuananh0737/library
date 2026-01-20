import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-de-code-qr',
  templateUrl: './de-code-qr.component.html',
  styleUrls: ['./de-code-qr.component.css']
})
export class DeCodeQRComponent implements OnInit {

  qrResult: any = null; 
  isScanning: boolean = true; 
  bookDetails$: BehaviorSubject<any> = new BehaviorSubject(null); 
  bookDetails: any;

  constructor(private http: HttpClient,private router: Router) {}

  ngOnInit(): void {}

  onCodeResult(result: string): void {
    if (result && result.startsWith("ID: ")) {
      this.qrResult = result;
      this.isScanning = false;
      this.fetchBookDetails(result);
    } else {
      console.error("Invalid QR code format");
      alert("Invalid QR code. Please try again.");
    }
  }
  
  

  fetchBookDetails(qrCode: string): void {
    const url = `${environment.apiUrl}/public/find-book-by-qr`;
    this.http.post(url, qrCode, { responseType: 'json' }).subscribe(
      (response) => {
        this.bookDetails$.next(response);
        this.bookDetails = response;
      },
      (error) => {
        console.error('Error fetching book details:', error);
        this.bookDetails$.next(null); 
      }
    );
  }
  
  navigateToBooks(): void {
    this.router.navigate(['/librarian/book'], {
      queryParams: { bookId: this.bookDetails.id },
    });
  }
    

  restartScanning(): void {
    this.qrResult = null;
    this.isScanning = true;
  }
}
