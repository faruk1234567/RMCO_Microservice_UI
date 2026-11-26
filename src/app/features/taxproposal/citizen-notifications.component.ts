import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-citizen-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './citizen-notifications.component.html',
  styleUrls: ['./citizen-notifications.component.css']
})
export class CitizenNotificationsComponent implements OnInit {
  popupNotification: any = null;
  showReport = false;
  reportProposal: any = null;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() {
    this.loadUnread();
  }

  loadUnread() {
    const user = this.auth.currentUser();
    if (!user) return;
    // municipalityId নাগরিকের নিজের প্রোফাইল থেকে আসবে, hard-code না
    this.http.get<any[]>(`/api/notifications/unread?municipalityId=${user.municipalityId}&userId=${user.id}`)
      .subscribe(list => {
        if (list && list.length > 0) {
          this.popupNotification = list[0]; // সবচেয়ে নতুনটা পপ-আপে
        }
      });
  }

  // দেখুন — পুরো রিপোর্ট খুলবে
  viewReport() {
    const refId = this.popupNotification.referenceId;
    this.http.get(`/api/tax-proposals/${refId}/public`)
      .subscribe(p => {
        this.reportProposal = p;
        this.showReport = true;
      });
  }

  // পরে দেখবো — পপ-আপ বন্ধ, কিন্তু নোটিফিকেশন unread থাকবে
  later() {
    this.popupNotification = null;
    this.showReport = false;
    // এখানে read মার্ক করবেন না, তাই বেল আইকনে থাকবে
  }

  // রিপোর্ট দেখার পর পড়া হিসেবে মার্ক
  markAsRead() {
    this.http.post(`/api/notifications/${this.popupNotification.id}/read`, {}).subscribe(() => {
      this.popupNotification = null;
      this.showReport = false;
      this.loadUnread();
    });
  }

  closeReport() {
    this.showReport = false;
    // রিপোর্ট বন্ধ করলেও নোটিফিকেশন unread থাকবে, চাইলে markAsRead() কল করবেন
  }
}