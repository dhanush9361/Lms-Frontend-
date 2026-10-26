import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
 
// ASSUMPTION: adjust this import path to wherever role.service.ts actually
// lives relative to this component's folder.
import { PermissionAction, PermissionRow, Role } from '../../services/role.service';
 
export interface PermissionToggleEvent {
  rowIndex: number;
  action: PermissionAction;
}
 
@Component({
  selector: 'app-role-permission',
  imports: [],
  templateUrl: './role-permission.html',
  styleUrl: './role-permission.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolePermission {
  /** Breadcrumb trail — last segment is rendered as the active pill. */
  readonly breadcrumb = input<string[]>([
    'Content Management',
    'Staff List',
    'Create Role',
    'Role Permission',
  ]);
 
  readonly role = input<Role | null>(null);
  readonly permissions = input.required<PermissionRow[]>();
  readonly actions = input<PermissionAction[]>(['create', 'read', 'update', 'delete']);
  readonly isEditing = input(false);
  readonly isAdmin = input(true);
  readonly submitting = input(false);
  readonly canSave = input(false);
 
  readonly togglePermission = output<PermissionToggleEvent>();
  readonly save = output<void>();
  readonly cancel = output<void>();
  readonly search = output<string>();
  readonly navigateBreadcrumb = output<number>();
 
  onToggle(rowIndex: number, action: PermissionAction): void {
    if (!this.isAdmin()) return;
    this.togglePermission.emit({ rowIndex, action });
  }

  isModuleCategory(categoryName: string): boolean {
    return ['Authentication', 'Content Management', 'Course Management', 'Enrollment'].includes(categoryName);
  }

  moduleCreateEnabled(categoryName: string): boolean {
    const rows = this.permissions().filter((row) => row.categoryName === categoryName);
    return rows.length > 0 && rows.every((row) => row.values.create);
  }

  onToggleModuleCreate(categoryName: string): void {
    if (!this.isAdmin()) return;

    const moduleRows = this.permissions()
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ row }) => row.categoryName === categoryName);
    const enable = !this.moduleCreateEnabled(categoryName);

    for (const { row, rowIndex } of moduleRows) {
      if (row.values.create !== enable) {
        this.togglePermission.emit({ rowIndex, action: 'create' });
      }
    }
  }
}
 