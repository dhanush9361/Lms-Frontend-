import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AdminPage, AdminSummary, AuthService } from '../../services/auth';
import { PackagePage, PackagePayload, PackageRecord, PackageService } from '../../services/package.service';
import { PackageManagement } from './package-management';

describe('PackageManagement', () => {
  let component: PackageManagement;
  let fixture: ComponentFixture<PackageManagement>;
  let packagesApi: PackageService;
  let storedPackage: PackageRecord;
  let updatePayload: PackagePayload | undefined;
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
    updatePayload = undefined;
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
    packagesApi.update = (id, payload) => {
      updatePayload = payload;
      storedPackage = { ...storedPackage, ...payload, id };
      packagePage.content = [storedPackage];
      return of(storedPackage);
    };
    TestBed.inject(AuthService).listAdmins = () => of(adminPage);
    const router = TestBed.inject(Router);
    router.getCurrentNavigation = () => null;
    router.navigate = () => Promise.resolve(true);

    fixture = TestBed.createComponent(PackageManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('persists User Management Update as off and reloads it as off when editing again', () => {
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

    const updateSwitch = fixture.nativeElement.querySelector(
      'button[aria-label="update User Management"]',
    ) as HTMLButtonElement;
    expect(updateSwitch.getAttribute('aria-checked')).toBe('true');
    updateSwitch.click();
    fixture.detectChanges();
    expect(updateSwitch.getAttribute('aria-checked')).toBe('false');

    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(updatePayload?.permissions[0].features[0].permissions.update).toBe(false);

    fixture.nativeElement.querySelector('button[aria-label="More actions"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[aria-label="Edit package"]').click();
    fixture.detectChanges();

    const reopenedUpdateSwitch = fixture.nativeElement.querySelector(
      'button[aria-label="update User Management"]',
    ) as HTMLButtonElement;
    expect(reopenedUpdateSwitch.getAttribute('aria-checked')).toBe('false');
  });
});
