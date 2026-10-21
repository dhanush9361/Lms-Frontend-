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

interface ManagedUserDto extends Partial<Omit<ManagedUser, 'department'>> {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  status?: string;
  department?: string | null;
}

interface UserPage {
  content: ManagedUserDto[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class BulkUserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/users/bulk`;
  private readonly usersUrl = `${environment.apiBaseUrl}/api/users`;

  listUsers(): Observable<ManagedUser[]> {
    return this.http
      .get<ApiResponse<UserPage | ManagedUserDto[]>>(this.usersUrl, {
        params: new HttpParams().set('page', 0).set('size', 100),
      })
      .pipe(
        map(({ data }) => {
          const rows = Array.isArray(data) ? data : data.content;
          return rows.map(user => ({
            id: user.id,
            username: user.username || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
            role: user.role,
            email: user.email,
            status: user.status || 'Active',
            department: user.department || '—',
            suspensionStartDate: user.suspensionStartDate ?? null,
            suspensionEndDate: user.suspensionEndDate ?? null,
          }));
        }),
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
    changes: Pick<ManagedUser, 'status' | 'suspensionStartDate' | 'suspensionEndDate'>,
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

  private readonly handleError = (error: HttpErrorResponse): Observable<never> => {
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
