import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { RoleManagement } from './role-management';
import { FeatureCatalogEntry, Role, RoleRequest, RoleService } from '../../services/role.service';

describe('RoleManagement saveRole', () => {
  let component: RoleManagement;
  let roleService: {
    getAll: ReturnType<typeof vi.fn>;
    getActive: ReturnType<typeof vi.fn>;
    getFeatureCatalog: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    invite: ReturnType<typeof vi.fn>;
  };

  const savedRole: Role = {
    id: 1,
    name: 'Coordinator',
    permissions: [],
    status: 'Active',
    createdAt: '2026-10-22T00:00:00Z',
    updatedAt: '2026-10-22T00:00:00Z',
  };

  beforeEach(() => {
    roleService = {
      getAll: vi.fn(() => of<Role[]>([])),
      getActive: vi.fn(() => of<Role[]>([])),
      getFeatureCatalog: vi.fn(() => of<FeatureCatalogEntry[]>([])),
      create: vi.fn((_request: RoleRequest) => of(savedRole)),
      update: vi.fn((_id: number, _request: RoleRequest) => of(savedRole)),
      delete: vi.fn(() => of(void 0)),
      invite: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      imports: [RoleManagement],
      providers: [provideRouter([]), { provide: RoleService, useValue: roleService }],
    });
    component = TestBed.createComponent(RoleManagement).componentInstance;
    component.roleForm.controls['roleName'].setValue('Coordinator');
    component.permissions.set([
      {
        categoryId: 'staff',
        categoryName: 'Content Management',
        category: 'Content Management',
        featureId: 'users',
        name: 'Users',
        values: { create: true, read: false, update: false, delete: false },
      },
    ]);
  });

  function expectFailure(error: HttpErrorResponse, message: string): void {
    roleService.create.mockReturnValue(throwError(() => error));
    component.saveRole();

    expect(component.actionError()).toBe(message);
    expect(component.submitting()).toBe(false);
    expect(component.success()).toBeNull();
    expect(component.roleForm.controls['roleName'].value).toBe('Coordinator');
    expect(component.permissions().length).toBe(1);
  }

  function prepareExistingRoleForUpdate(): Role {
    const role: Role = {
      ...savedRole,
      name: 'Instructor',
      permissions: [
        {
          id: 'staff',
          name: 'Content Management',
          enabled: true,
          features: [
            {
              id: 'users',
              name: 'Users',
              permissions: { create: true, read: false, update: false, delete: false },
            },
          ],
        },
      ],
    };
    component.features.set([
      {
        categoryId: 'staff',
        categoryName: 'Content Management',
        features: [
          {
            id: 'users',
            name: 'Users',
            permissions: { create: true, read: false, update: false, delete: false },
          },
        ],
      },
    ]);
    component.openRoleDetails(role);
    component.togglePermission(0, 'read');
    return role;
  }

  it('shows the network message and preserves form data when offline', () => {
    expectFailure(
      new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }),
      'Network connection lost. Please check your internet connection and try again.',
    );
  });

  it.each([500, 502, 503, 599])('uses a safe message for HTTP %i errors', (status) => {
    expectFailure(
      new HttpErrorResponse({
        status,
        statusText: 'Server Error',
        error: { message: 'Internal stack trace must not be shown' },
      }),
      'Unable to save the role. Please try again later.',
    );
  });

  it.each([
    { message: 'Role already exists.' },
    { data: { name: 'Role already exists.' } },
    { error: 'duplicate role' },
  ])('maps HTTP 409 response formats to the duplicate-role message', (body) => {
    expectFailure(
      new HttpErrorResponse({ status: 409, statusText: 'Conflict', error: body }),
      'Role already exists.',
    );
    expect(component.dialog()).toBe('role');
  });

  it('keeps current permissions when the role name is corrected after a conflict', () => {
    roleService.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.permissionStep.set(true);
    component.saveRole();

    component.roleForm.controls['roleName'].setValue('Team Coordinator');
    component.nextToPermissions();

    expect(component.dialog()).toBeNull();
    expect(component.permissionStep()).toBe(true);
    expect(component.roleForm.controls['roleName'].value).toBe('Team Coordinator');
    expect(component.permissions().length).toBe(1);
  });

  it('allows retry after a network failure and reports success after the retry', () => {
    roleService.create
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValueOnce(of(savedRole));

    component.saveRole();
    expect(component.submitting()).toBe(false);
    expect(component.roleForm.controls['roleName'].value).toBe('Coordinator');
    expect(component.permissions().length).toBe(1);

    component.saveRole();
    expect(roleService.create).toHaveBeenCalledTimes(2);
    expect(component.submitting()).toBe(false);
    expect(component.success()).toBe('Role created.');
    expect(component.actionError()).toBeNull();
  });

  it('prevents duplicate submissions while the request is in progress', () => {
    roleService.create.mockReturnValue(new Observable<Role>(() => undefined));

    component.saveRole();
    component.saveRole();

    expect(roleService.create).toHaveBeenCalledTimes(1);
    expect(component.submitting()).toBe(true);
  });

  it.each([500, 503, 599])('preserves the edited role state after update HTTP %i', (status) => {
    const instructor = prepareExistingRoleForUpdate();
    roleService.update.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status,
        statusText: 'Server Error',
        error: { message: 'Internal server details' },
      })),
    );

    component.saveRole();

    expect(roleService.update).toHaveBeenCalledTimes(1);
    expect(component.actionError()).toBe('Unable to update the role. Please try again later.');
    expect(component.submitting()).toBe(false);
    expect(component.success()).toBeNull();
    expect(component.selectedRole()).toBe(instructor);
    expect(component.permissions()[0].values.read).toBe(true);
    expect(component.canUpdateRole()).toBe(true);
    expect(component.permissionStep()).toBe(true);
  });

  it('keeps the edited role ready for a user-initiated retry after network loss', () => {
    const instructor = prepareExistingRoleForUpdate();
    roleService.update
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })))
      .mockReturnValueOnce(of(instructor));

    component.saveRole();

    expect(roleService.update).toHaveBeenCalledTimes(1);
    expect(component.actionError()).toBe(
      'Network connection lost. Please check your internet connection and try again.',
    );
    expect(component.submitting()).toBe(false);
    expect(component.success()).toBeNull();
    expect(component.selectedRole()).toBe(instructor);
    expect(component.permissions()[0].values.read).toBe(true);
    expect(component.canUpdateRole()).toBe(true);

    // This second request occurs only after the test explicitly invokes saveRole again.
    component.saveRole();

    expect(roleService.update).toHaveBeenCalledTimes(2);
    expect(component.submitting()).toBe(false);
    expect(component.success()).toBe('Role updated.');
    expect(component.actionError()).toBeNull();
  });

  it('resets loading and shows success only after a successful update', () => {
    prepareExistingRoleForUpdate();
    roleService.update.mockReturnValue(of(savedRole));

    component.saveRole();

    expect(component.submitting()).toBe(false);
    expect(component.success()).toBe('Role updated.');
    expect(component.actionError()).toBeNull();
    expect(component.permissionStep()).toBe(false);
  });

  it('prevents duplicate update submissions while the request is in progress', () => {
    prepareExistingRoleForUpdate();
    roleService.update.mockReturnValue(new Observable<Role>(() => undefined));

    component.saveRole();
    component.saveRole();

    expect(roleService.update).toHaveBeenCalledTimes(1);
    expect(component.submitting()).toBe(true);
  });

  it('enables Update only for changed permissions and disables it when they are restored', () => {
    component.features.set([
      {
        categoryId: 'staff',
        categoryName: 'Content Management',
        features: [
          {
            id: 'users',
            name: 'Users',
            permissions: { create: true, read: false, update: false, delete: false },
          },
        ],
      },
    ]);
    const instructor: Role = {
      ...savedRole,
      name: 'Instructor',
      permissions: [
        {
          id: 'staff',
          name: 'Content Management',
          enabled: true,
          features: [
            {
              id: 'users',
              name: 'Users',
              permissions: { create: true, read: false, update: false, delete: false },
            },
          ],
        },
      ],
    };

    component.openRoleDetails(instructor);
    expect(component.canUpdateRole()).toBe(false);

    component.togglePermission(0, 'update');
    expect(component.canUpdateRole()).toBe(true);

    component.togglePermission(0, 'update');
    expect(component.canUpdateRole()).toBe(false);

    component.togglePermission(0, 'create');
    expect(component.canUpdateRole()).toBe(true);
  });

  it('detects role field changes and disables Update when the original value is restored', () => {
    const instructor: Role = { ...savedRole, name: 'Instructor', description: 'Teaching role' };
    component.features.set([]);
    component.openRoleDetails(instructor);
    expect(component.canUpdateRole()).toBe(false);

    component.selectedRole.set({ ...instructor, description: 'Updated description' });
    expect(component.canUpdateRole()).toBe(true);

    component.selectedRole.set(instructor);
    expect(component.canUpdateRole()).toBe(false);
  });
});
