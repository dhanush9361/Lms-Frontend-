import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionRow } from '../../services/role.service';
import { RolePermission } from './role-permission';

describe('RolePermission', () => {
  let component: RolePermission;
  let fixture: ComponentFixture<RolePermission>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolePermission],
    }).compileComponents();

    fixture = TestBed.createComponent(RolePermission);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('permissions', []);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows module Create toggles and keeps the feature CRUD toggles', () => {
    const categories = ['Authentication', 'Content Management', 'Course Management', 'Enrollment'];
    const permissions: PermissionRow[] = categories.map((categoryName, rowIndex) => ({
      categoryId: categoryName.toLowerCase().replaceAll(' ', '-'),
      categoryName,
      category: categoryName,
      featureId: `feature-${rowIndex}`,
      name: `${categoryName} feature`,
      values: { create: false, read: true, update: false, delete: true },
    }));
    fixture.componentRef.setInput('permissions', permissions);
    fixture.detectChanges();

    const events: { rowIndex: number; action: string }[] = [];
    component.togglePermission.subscribe((event) => events.push(event));

    for (const categoryName of categories) {
      const moduleToggle = fixture.nativeElement.querySelector(
        `button[aria-label="Create permission for ${categoryName}"]`,
      ) as HTMLButtonElement;
      expect(moduleToggle).toBeTruthy();
      moduleToggle.click();
    }

    expect(events).toEqual(categories.map((_, rowIndex) => ({ rowIndex, action: 'create' })));
    expect(fixture.nativeElement.querySelector('button[aria-label="create Authentication feature"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[aria-label="read Authentication feature"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[aria-label="update Authentication feature"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[aria-label="delete Authentication feature"]')).toBeTruthy();
  });
});
