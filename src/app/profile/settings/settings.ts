import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, catchError, expand, finalize, forkJoin, of, reduce } from 'rxjs';

import { AdminPage, AdminSummary, AuthService } from '../../services/auth';
import {
  AVAILABLE_PACKAGE_OPTIONS,
  PackagePage,
  PackageRecord,
  PackageService,
} from '../../services/package.service';

type BillingCycle = 'Monthly' | 'Yearly';
type CurrencyCode = 'USD' | 'EUR' | 'INR';
type DetailsTab = 'subscription' | 'billing';

@Component({
  selector: 'app-settings',
  imports: [CurrencyPipe],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings implements OnInit {
  private readonly router = inject(Router);
  private readonly packagesApi = inject(PackageService);
  private readonly authApi = inject(AuthService);

  protected readonly packages = signal<PackageRecord[]>([]);
  protected readonly packageAssignmentCounts = signal<ReadonlyMap<number, number>>(new Map());
  protected readonly assignmentCountsAvailable = signal(false);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly assignmentLoadError = signal('');
  protected readonly actionMessage = signal('');
  protected readonly billingCycle = signal<BillingCycle>('Monthly');
  protected readonly currency = signal<CurrencyCode>('USD');
  protected readonly detailsOpen = signal(false);
  protected readonly detailsTab = signal<DetailsTab>('subscription');
  protected readonly selectedPackage = signal<PackageRecord | null>(null);
  protected readonly visiblePackages = computed(() => {
    return this.packages()
      .filter((item) => item.billingCycle === this.billingCycle())
      .sort((first, second) => {
        const categoryOrder =
          AVAILABLE_PACKAGE_OPTIONS.indexOf(first.availablePackage) -
          AVAILABLE_PACKAGE_OPTIONS.indexOf(second.availablePackage);
        return categoryOrder || this.packageAssignmentCount(second) - this.packageAssignmentCount(first);
      });
  });

  protected readonly popularPackageIds = computed<ReadonlySet<number>>(() => {
    if (!this.assignmentCountsAvailable()) return new Set<number>();
    const packagesByPrice = new Map<number, PackageRecord[]>();
    for (const item of this.visiblePackages()) {
      const samePricePackages = packagesByPrice.get(item.price) ?? [];
      samePricePackages.push(item);
      packagesByPrice.set(item.price, samePricePackages);
    }

    const popularIds = new Set<number>();
    for (const samePricePackages of packagesByPrice.values()) {
      if (samePricePackages.length < 2) continue;

      const counts = samePricePackages.map((item) => this.packageAssignmentCount(item));
      const highestCount = Math.max(...counts);
      if (highestCount === 0 || counts.filter((count) => count === highestCount).length !== 1) continue;

      const popularPackage = samePricePackages[counts.indexOf(highestCount)];
      popularIds.add(popularPackage.id);
    }

    return popularIds;
  });

  ngOnInit(): void {
    this.loadPackages();
  }

  protected loadPackages(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.assignmentLoadError.set('');
    this.assignmentCountsAvailable.set(false);
    this.packageAssignmentCounts.set(new Map());

    forkJoin({
      packages: this.loadAllPackages(),
      admins: this.loadAllAdmins().pipe(
        catchError((error: unknown) => {
          console.error('Failed to load package assignments:', error);
          this.assignmentLoadError.set(
            error instanceof HttpErrorResponse && error.status === 403
              ? 'Package popularity could not be calculated because you do not have permission to view assignments.'
              : 'Package popularity could not be calculated. Please try again.',
          );
          return of(null);
        }),
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ packages, admins }) => {
          this.packages.set(packages);
          if (admins) {
            this.packageAssignmentCounts.set(this.countAssignments(admins));
            this.assignmentCountsAvailable.set(true);
          }
        },
        error: (error: unknown) => {
          console.error('Failed to load subscription plans:', error);
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.loadError.set('Your session has expired. Please log in again.');
            void this.router.navigate(['/auth'], {
              state: { message: 'Your session has expired. Please log in again.' },
            });
            return;
          }

          this.loadError.set(
            error instanceof HttpErrorResponse && error.status === 0
              ? 'Please check your internet connection and try again.'
              : error instanceof HttpErrorResponse && error.status === 403
                ? 'You do not have permission to view subscription plans.'
                : error instanceof HttpErrorResponse && error.status >= 500
                  ? 'Something went wrong. Please try again later.'
                  : 'Could not load subscription plans. Please try again.',
          );
        },
      });
  }

  protected setBillingCycle(value: string): void {
    if ((value !== 'Monthly' && value !== 'Yearly') || value === this.billingCycle()) return;

    this.billingCycle.set(value);
    this.actionMessage.set('');
  }

  protected setCurrency(value: string): void {
    if (value === 'USD' || value === 'EUR' || value === 'INR') {
      this.currency.set(value);
      this.actionMessage.set('');
    }
  }

  protected openDetails(tab: DetailsTab = 'subscription'): void {
    this.detailsTab.set(tab);
    this.detailsOpen.set(true);
  }

  protected openManageDetails(): void {
    this.selectedPackage.set(null);
    this.openDetails();
  }

  protected openPackageDetails(item: PackageRecord): void {
    this.selectedPackage.set(item);
    this.detailsTab.set('subscription');
    this.detailsOpen.set(true);
  }

  protected closeDetails(): void {
    this.detailsOpen.set(false);
    this.selectedPackage.set(null);
  }

  protected goBack(): void {
    const dashboard = this.router.url.startsWith('/super-admin-dashboard')
      ? '/super-admin-dashboard'
      : '/admin-dashboard';
    void this.router.navigateByUrl(dashboard);
  }

  protected selectPlan(item: PackageRecord): void {
    if (this.currency() === 'EUR') {
      this.actionMessage.set(
        'EUR pricing is not available in the current package catalog. Select USD to view the listed price.',
      );
      return;
    }

    this.actionMessage.set(
      `The Payment Methods page is not configured in this frontend yet. ${item.name} was not selected.`,
    );
  }

  protected featuresFor(item: PackageRecord): string[] {
    return item.permissions
      .filter((category) => category.enabled)
      .flatMap((category) =>
        category.features
          .filter(({ permissions }) => Object.values(permissions).some(Boolean))
          .map(({ name }) => name),
      );
  }

  protected packageAssignmentCount(item: PackageRecord): number {
    return this.packageAssignmentCounts().get(item.id) ?? 0;
  }

  protected isPopular(item: PackageRecord): boolean {
    return this.popularPackageIds().has(item.id);
  }

  protected packageStorageLimit(item: PackageRecord): string {
    return item.storageLimit === null ? 'Unlimited' : String(item.storageLimit);
  }

  private loadAllAdmins() {
    const pageSize = 200;
    return this.authApi.listAdmins({ status: 'All', page: 0, size: pageSize }).pipe(
      expand((page) =>
        page.number + 1 < page.totalPages
          ? this.authApi.listAdmins({ status: 'All', page: page.number + 1, size: pageSize })
          : EMPTY,
      ),
      reduce((admins: AdminSummary[], page: AdminPage) => admins.concat(page.content), []),
    );
  }

  private loadAllPackages() {
    const pageSize = 100;
    return this.packagesApi.list({ page: 0, size: pageSize }).pipe(
      expand((page) =>
        page.number + 1 < page.totalPages
          ? this.packagesApi.list({ page: page.number + 1, size: pageSize })
          : EMPTY,
      ),
      reduce((packages: PackageRecord[], page: PackagePage) => packages.concat(page.content), []),
    );
  }

  private countAssignments(admins: AdminSummary[]): ReadonlyMap<number, number> {
    const counts = new Map<number, number>();
    for (const admin of admins) {
      if (admin.packageId !== null) {
        counts.set(admin.packageId, (counts.get(admin.packageId) ?? 0) + 1);
      }
    }
    return counts;
  }

}
