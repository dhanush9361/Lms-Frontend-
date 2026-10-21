import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-admin-dashboard-home',
  imports: [RouterLink],
  templateUrl: './admin-dashboard-home.html',
  styleUrl: './admin-dashboard-home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardHome {
  
}
