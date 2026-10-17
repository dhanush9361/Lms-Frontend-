import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-super-admin-dashboard',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './super-admin-dashboard.html',
  styleUrl: './super-admin-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminDashboard {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // ---------- header: identity ----------
  readonly displayName = this.auth.displayName;
  readonly roleLabel = computed(() => this.auth.user()?.role ?? '');

  readonly headerName = computed(() => this.auth.user()?.firstName?.trim() || this.displayName());

  readonly initials = computed(() => {
    const parts = this.displayName().trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  });

  // ---------- header: account dropdown ----------
  readonly accountMenuOpen = signal(false);

  @HostListener('document:click')
  closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/auth']);
  }

  // ---------- header: notification badge ----------
  readonly unreadNotifications = signal(0);

  // ---------- header: action stubs ----------
  openNotifications(): void {
    // TODO: open the notifications panel once the backend endpoint is available.
  }

  openMessages(): void {
    // TODO: open the messages panel once that feature ships.
  }

  openSettings(): void {
    // TODO: navigate to account/organization settings once that route exists.
  }

  onGlobalSearch(term: string): void {
    void term;
  }
}