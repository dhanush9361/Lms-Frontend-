import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { PackageDraftService, PackagePayload, PackageRecord, PackageService } from '../../services/package.service';
import { PackagePermissionStep } from './package-permission-step';

describe('PackagePermissionStep', () => {
  let component: PackagePermissionStep;
  let fixture: ComponentFixture<PackagePermissionStep>;
  let submittedPayload: PackagePayload | undefined;

  beforeEach(async () => {
    submittedPayload = undefined;
    await TestBed.configureTestingModule({
      imports: [PackagePermissionStep],
    }).compileComponents();

    const packagesApi = TestBed.inject(PackageService);
    packagesApi.getFeatureCatalog = () =>
      of([
        {
          categoryId: 'user-management',
          categoryName: 'User Management',
          features: [
            {
              id: 'AUTH_USER_ACCESS',
              name: 'User Management',
              permissions: { create: false, read: false, update: false, delete: false },
            },
          ],
        },
      ]);
    packagesApi.create = (payload: PackagePayload) => {
      submittedPayload = payload;
      return of({} as PackageRecord);
    };
    TestBed.inject(Router).navigate = () => Promise.resolve(true);

    TestBed.inject(PackageDraftService).startDraft({
      name: 'Test package',
      availablePackage: 'Basic',
      description: null,
      price: 10,
      billingCycle: 'Monthly',
      userLimit: 5,
      storageLimit: null,
      permissions: [],
    });

    fixture = TestBed.createComponent(PackagePermissionStep);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('saves User Management Update as off independently in the API payload', () => {
    const updateSwitch = fixture.nativeElement.querySelector(
      'button[aria-label="update User Management"]',
    ) as HTMLButtonElement;
    updateSwitch.click();
    fixture.detectChanges();
    expect(updateSwitch.getAttribute('aria-checked')).toBe('true');

    const readSwitch = fixture.nativeElement.querySelector(
      'button[aria-label="read User Management"]',
    ) as HTMLButtonElement;
    expect(readSwitch.getAttribute('aria-checked')).toBe('false');

    updateSwitch.click();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const saveButton = Array.from(buttons).find((button) => button.textContent?.includes('Save Package'));
    expect(saveButton).toBeTruthy();
    saveButton?.click();

    expect(submittedPayload?.permissions[0].features[0].permissions).toEqual({
      create: false,
      read: false,
      update: false,
      delete: false,
    });
  });
});
