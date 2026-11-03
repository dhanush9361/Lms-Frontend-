import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type BulkUserOperation =
  | 'import-users'
  | 'export-users'
  | 'bulk-enrollment'
  | 'bulk-unenrollment'
  | 'bulk-user-deletion';

export class BulkUserRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'BulkUserRequestError';
  }
}

export interface ManagedUser {
  id: number;
  username: string;
  role: string;
  email: string;
  status: string;
  department: string;
  suspensionStartDate: string | null;
  suspensionEndDate: string | null;
}

export type ManagedUserChanges = Partial<
  Pick<
    ManagedUser,
    'username' | 'email' | 'role' | 'department' | 'status' | 'suspensionStartDate' | 'suspensionEndDate'
  >
>;

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function readUserId(record: Record<string, unknown>): number | null {
  const value = record['id'] ?? record['userId'];
  const id = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getUserRows(response: unknown): unknown[] {
  let value = response;
  for (let depth = 0; depth < 4; depth++) {
    if (Array.isArray(value)) return value;
    if (!isRecord(value)) break;

    if (Array.isArray(value['content'])) return value['content'];
    if (Array.isArray(value['users'])) return value['users'];
    if (Array.isArray(value['userList'])) return value['userList'];
    if (value['data'] !== undefined) {
      value = value['data'];
      continue;
    }
    break;
  }

  throw new BulkUserRequestError('The server returned an invalid user list response.', 0);
}

function toManagedUser(value: unknown): ManagedUser {
  if (!isRecord(value)) {
    throw new BulkUserRequestError('The server returned an invalid user record.', 0);
  }

  const id = readUserId(value);
  if (id === null) {
    throw new BulkUserRequestError('A user record is missing a valid ID.', 0);
  }

  const firstName = readString(value, 'firstName', 'first_name');
  const lastName = readString(value, 'lastName', 'last_name');
  const email = readString(value, 'email', 'emailId', 'emailAddress') ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const username =
    readString(value, 'username', 'userName', 'displayName', 'fullName', 'name') ??
    (fullName || email || `User ${id}`);
  const rawStatus = value['status'] ?? value['accountStatus'];
  const status =
    typeof rawStatus === 'string'
      ? rawStatus.trim().toLowerCase() === 'inactive'
        ? 'Inactive'
        : rawStatus.trim().toLowerCase() === 'active'
          ? 'Active'
          : rawStatus.trim()
      : typeof value['isActive'] === 'boolean'
        ? value['isActive'] ? 'Active' : 'Inactive'
        : 'Active';

  return {
    id,
    username,
    role: readString(value, 'role', 'roleName') ?? '',
    email,
    status,
    department: readString(value, 'department', 'departmentName') ?? '—',
    suspensionStartDate:
      readString(value, 'suspensionStartDate', 'suspension_start_date'),
    suspensionEndDate:
      readString(value, 'suspensionEndDate', 'suspension_end_date'),
  };
}

@Injectable({ providedIn: 'root' })
export class BulkUserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/users/bulk`;
  private readonly usersUrl = `${environment.apiBaseUrl}/api/users`;

  listUsers(): Observable<ManagedUser[]> {
    return this.http
      .get<unknown>(this.usersUrl, {
        params: new HttpParams().set('page', 0).set('size', 100),
      })
      .pipe(
        map(response => getUserRows(response).map(toManagedUser)),
        catchError(this.handleError),
      );
  }

  upload(operation: Exclude<BulkUserOperation, 'export-users'>, file: File): Observable<string> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/${operation}`, body)
      .pipe(map(response => response.message || 'File uploaded successfully.'), catchError(this.handleError));
  }

  exportUsers(userIds: number[] = []): Observable<Blob> {
    let params = new HttpParams();
    if (userIds.length) params = params.set('userIds', userIds.join(','));
    return this.http
      .get(`${this.baseUrl}/export-users`, { params, responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  updateUser(
    userId: number,
    changes: ManagedUserChanges,
  ): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${this.usersUrl}/${userId}`, changes)
      .pipe(map(() => undefined), catchError(this.handleError));
  }

  deleteUser(userId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.usersUrl}/${userId}`)
      .pipe(map(() => undefined), catchError(this.handleError));
  }

  downloadTemplate(operation: BulkUserOperation): Observable<Blob> {
    return this.http
      .get(`${this.baseUrl}/${operation}/template`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  private readonly handleError = (error: unknown): Observable<never> => {
    if (error instanceof BulkUserRequestError) {
      return throwError(() => error);
    }
    if (!(error instanceof HttpErrorResponse)) {
      return throwError(() => new BulkUserRequestError('The server returned an invalid user list response.', 0));
    }
    if (error.status === 0) {
      return throwError(() => new BulkUserRequestError('Something went wrong. Please try again later.', 0));
    }
    if (error.error instanceof Blob) {
      return throwError(() => new BulkUserRequestError('The file could not be processed. Check the Excel file and try again.', error.status));
    }
    const body = error.error as { message?: string } | null;
    return throwError(() => new BulkUserRequestError(body?.message || 'Something went wrong. Please try again later.', error.status));
  };
}
