import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BulkUserOperation, BulkUserRequestError, BulkUserService, ManagedUser } from '../../../services/bulk-user.service';
import { Subscription } from 'rxjs';

interface BulkAction {
  id: BulkUserOperation;
  label: string;
  description: string;
}

interface UserActionDraft {
  user: ManagedUser;
  status: 'Active' | 'Inactive';
  suspendUser: boolean;
  startDate: string;
  endDate: string;
  deleteUser: boolean;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-bulk-user',
  imports: [],
  templateUrl: './bulk-user.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkUser implements OnInit {
  private readonly bulkUsers = inject(BulkUserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  protected readonly actions: readonly BulkAction[] = [
    { id: 'import-users', label: 'Import Users', description: 'Add multiple users from an Excel file.' },
    { id: 'export-users', label: 'Export Users', description: 'Download user data in an Excel file.' },
    { id: 'bulk-enrollment', label: 'Bulk Enrollment', description: 'Enroll multiple users from an Excel file.' },
    { id: 'bulk-unenrollment', label: 'Bulk Unenrollment', description: 'Unenroll multiple users from an Excel file.' },
    { id: 'bulk-user-deletion', label: 'Bulk User Deletion', description: 'Delete multiple users from an Excel file.' },
  ];

  protected readonly activeAction = signal<BulkAction | null>(null);
  protected readonly users = signal<ManagedUser[]>([]);
  protected readonly filteredUsers = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) return this.users();
    return this.users().filter(user =>
      [user.username, user.role, user.email, user.status, user.department]
        .some(value => value.toLocaleLowerCase().includes(query)),
    );
  });
  protected readonly searchTerm = signal('');
  protected readonly selectedUserIds = signal<Set<number>>(new Set());
  protected readonly allVisibleSelected = computed(() =>
    this.filteredUsers().length > 0 && this.filteredUsers().every(user => this.selectedUserIds().has(user.id)),
  );
  protected readonly loadingUsers = signal(false);
  protected readonly rowActionDraft = signal<UserActionDraft | null>(null);
  protected readonly savingRowAction = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploading = signal(false);
  protected readonly downloading = signal(false);
  protected readonly feedback = signal('');
  protected readonly feedbackIsError = signal(false);
  private uploadRequest: Subscription | null = null;
  private actionTrigger: HTMLElement | null = null;
  private rowActionTrigger: HTMLElement | null = null;

  ngOnInit(): void {
    this.loadUsers();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => this.searchTerm.set(params.get('search') ?? ''));
  }

  protected loadUsers(): void {
    this.loadingUsers.set(true);
    this.bulkUsers.listUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: users => {
        this.users.set(users);
        this.loadingUsers.set(false);
        const ids = new Set(users.map(user => user.id));
        this.selectedUserIds.update(selected => new Set([...selected].filter(id => ids.has(id))));
      },
      error: (error: BulkUserRequestError) => {
        this.loadingUsers.set(false);
        this.handleRequestError(error);
      },
    });
  }

  protected toggleAllVisible(checked: boolean): void {
    const visible = this.filteredUsers().map(user => user.id);
    this.selectedUserIds.update(current => {
      const next = new Set(current);
      visible.forEach(id => checked ? next.add(id) : next.delete(id));
      return next;
    });
  }

  protected toggleUser(userId: number, checked: boolean): void {
    this.selectedUserIds.update(current => {
      const next = new Set(current);
      checked ? next.add(userId) : next.delete(userId);
      return next;
    });
  }

  protected onBulkActionChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const action = this.actions.find(item => item.id === select.value);
    select.value = '';
    if (action) this.openAction(action);
  }

  protected openRowActions(user: ManagedUser): void {
    this.rowActionTrigger = this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    this.rowActionDraft.set({
      user,
      status: user.status === 'Inactive' ? 'Inactive' : 'Active',
      suspendUser: Boolean(user.suspensionStartDate || user.suspensionEndDate),
      startDate: user.suspensionStartDate ?? '',
      endDate: user.suspensionEndDate ?? '',
      deleteUser: false,
    });
    queueMicrotask(() => this.document.getElementById(`suspend-user-${user.id}`)?.focus());
  }

  protected cancelRowActions(): void {
    this.rowActionDraft.set(null);
    this.rowActionTrigger?.focus();
    this.rowActionTrigger = null;
  }

  protected onRowActionKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelRowActions();
    }
  }

  protected saveRowActions(): void {
    const draft = this.rowActionDraft();
    if (!draft || this.savingRowAction()) return;
    if (draft.suspendUser && (!draft.startDate || !draft.endDate || draft.startDate > draft.endDate)) {
      this.showFeedback('Choose a valid suspension start and end date.', true);
      return;
    }
    this.savingRowAction.set(true);
    const request = draft.deleteUser
      ? this.bulkUsers.deleteUser(draft.user.id)
      : this.bulkUsers.updateUser(draft.user.id, {
          status: draft.status,
          suspensionStartDate: draft.suspendUser ? draft.startDate : null,
          suspensionEndDate: draft.suspendUser ? draft.endDate : null,
        });
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.savingRowAction.set(false);
        this.rowActionDraft.set(null);
        this.showFeedback(draft.deleteUser ? 'User deleted successfully.' : 'User updated successfully.', false);
        this.rowActionTrigger = null;
        this.document.getElementById('select-visible-users')?.focus();
        this.loadUsers();
      },
      error: (error: BulkUserRequestError) => {
        this.savingRowAction.set(false);
        this.handleRequestError(error);
      },
    });
  }

  protected updateRowDraft(changes: Partial<Omit<UserActionDraft, 'user'>>): void {
    this.rowActionDraft.update(draft => draft ? { ...draft, ...changes } : draft);
  }

  protected openAction(action: BulkAction): void {
    this.actionTrigger = this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    this.clearFeedback();
    if (action.id === 'export-users') {
      this.activeAction.set(action);
      this.downloadExport();
      return;
    }
    this.activeAction.set(action);
    this.selectedFile.set(null);
    queueMicrotask(() => this.document.getElementById('bulk-excel-file')?.focus());
  }

  protected closeDialog(): void {
    this.uploadRequest?.unsubscribe();
    this.uploadRequest = null;
    this.uploading.set(false);
    this.activeAction.set(null);
    this.selectedFile.set(null);
    this.clearFeedback();
    this.actionTrigger?.focus();
    this.actionTrigger = null;
  }

  protected onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDialog();
      return;
    }
    if (event.key === 'Tab') {
      const dialog = event.currentTarget as HTMLElement;
      const controls = dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])');
      const first = controls.item(0);
      const last = controls.item(controls.length - 1);
      if (event.shiftKey && this.document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && this.document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(null);
    this.clearFeedback();
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.showFeedback('Please select a valid Excel file.', true);
      input.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.showFeedback('The file exceeds the maximum allowed size of 10 MB.', true);
      input.value = '';
      return;
    }
    this.selectedFile.set(file);
  }

  protected upload(): void {
    const action = this.activeAction();
    const file = this.selectedFile();
    if (!action || action.id === 'export-users' || !file || this.uploading()) return;

    this.uploading.set(true);
    this.clearFeedback();
    this.uploadRequest = this.bulkUsers
      .upload(action.id, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: message => {
          this.uploadRequest = null;
          this.uploading.set(false);
          this.showFeedback(message || 'File uploaded successfully.', false);
          this.selectedFile.set(null);
          const fileInput = this.document.getElementById('bulk-excel-file') as HTMLInputElement | null;
          if (fileInput) fileInput.value = '';
          this.loadUsers();
        },
        error: (error: BulkUserRequestError) => {
          this.uploadRequest = null;
          this.uploading.set(false);
          this.handleRequestError(error);
        },
      });
  }

  protected downloadTemplate(): void {
    const action = this.activeAction();
    if (!action || this.downloading()) return;
    this.downloading.set(true);
    this.bulkUsers
      .downloadTemplate(action.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          this.saveFile(blob, `${action.id}-template.xlsx`);
          this.downloading.set(false);
        },
        error: (error: BulkUserRequestError) => {
          this.downloading.set(false);
          this.handleRequestError(error);
        },
      });
  }

  protected downloadExport(): void {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.bulkUsers
      .exportUsers([...this.selectedUserIds()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          this.saveFile(blob, 'users.xlsx');
          this.downloading.set(false);
          this.showFeedback('User data exported successfully.', false);
        },
        error: (error: BulkUserRequestError) => {
          this.downloading.set(false);
          this.handleRequestError(error);
        },
      });
  }

  private saveFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private clearFeedback(): void {
    this.feedback.set('');
    this.feedbackIsError.set(false);
  }

  private showFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }

  private handleRequestError(error: BulkUserRequestError): void {
    if (error.status === 401) {
      void this.router.navigate(['/auth'], { state: { message: 'Your session has expired. Please log in again.' } });
      return;
    }
    this.showFeedback(error.message || 'Something went wrong. Please try again later.', true);
  }
}
