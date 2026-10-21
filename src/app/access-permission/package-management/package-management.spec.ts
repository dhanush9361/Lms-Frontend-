import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AdminPage, AdminSummary, AuthService } from '../../services/auth';
import { PackageDraftService, PackagePage, PackageRecord, PackageService } from '../../services/package.service';
import { PackageManagement } from './package-management';

describe('PackageManagement', () => {
  let component: PackageManagement;
  let fixture: ComponentFixture<PackageManagement>;
  let packagesApi: PackageService;
  let storedPackage: PackageRecord;
  let draft: PackageDraftService;
  let navigatedCommands: readonly unknown[] | undefined;
  const admin: AdminSummary = {
    id: 11,
    username: 'manager',
    email: 'manager@example.test',
    role: 'ADMIN',
    status: 'Active',
    packageId: 21,
    packageExpiresAt: null,
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    navigatedCommands = undefined;
    storedPackage = {
      id: 21,
      name: 'Team',
      availablePackage: 'Basic',
      description: null,
      price: 20,
      billingCycle: 'Monthly',
      userLimit: 10,
      storageLimit: null,
      status: 'Active',
      createdAt: '2026-01-01T00:00:00Z',
      permissions: [
        {
          id: 'users',
          name: 'User Management',
          enabled: true,
          features: [
            {
              id: 'AUTH_USER_ACCESS',
              name: 'User Management',
              permissions: { create: true, read: true, update: true, delete: true },
            },
          ],
        },
      ],
    };

    await TestBed.configureTestingModule({
      imports: [PackageManagement],
    }).compileComponents();

    const packagePage: PackagePage = {
      content: [storedPackage],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 100,
    };
    const adminPage: AdminPage = {
      content: [admin],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    };

    packagesApi = TestBed.inject(PackageService);
    packagesApi.list = () => of(packagePage);
    packagesApi.getByIds = () => of([storedPackage]);
    draft = TestBed.inject(PackageDraftService);
    TestBed.inject(AuthService).listAdmins = () => of(adminPage);
    const router = TestBed.inject(Router);
    router.getCurrentNavigation = () => null;
    router.navigate = (commands) => {
      navigatedCommands = commands;
      return Promise.resolve(true);
    };

    fixture = TestBed.createComponent(PackageManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigates to permissions with the edited package and its existing permissions', () => {
    const moreActions = fixture.nativeElement.querySelector(
      'button[aria-label="More actions"]',
    ) as HTMLButtonElement;
    moreActions.click();
    fixture.detectChanges();

    const editButton = fixture.nativeElement.querySelector(
      'button[aria-label="Edit package"]',
    ) as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    const nextButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(nextButton.textContent).toContain('Next');
    nextButton.click();
    fixture.detectChanges();

    expect(draft.editingPackageId()).toBe(21);
    expect(draft.pendingPayload()?.permissions[0].features[0].permissions.update).toBe(true);
    expect(navigatedCommands).toEqual(['/super-admin-dashboard/package/create/permissions']);
  });
});
