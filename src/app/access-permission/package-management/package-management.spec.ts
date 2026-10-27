import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../services/auth';
import { PackageService } from '../../services/package.service';
import { PackageManagement } from './package-management';

describe('PackageManagement', () => {
  let component: PackageManagement;
  let fixture: ComponentFixture<PackageManagement>;
  const requestedStatuses: string[] = [];

  beforeEach(async () => {
    requestedStatuses.length = 0;
    await TestBed.configureTestingModule({
      imports: [PackageManagement],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            listAdmins: (query: { status?: string }) => {
              requestedStatuses.push(query.status ?? '');
              return of({ content: [], totalPages: 1, number: 0 });
            },
          },
        },
        {
          provide: PackageService,
          useValue: {
            list: () => of({ content: [] }),
            getByIds: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PackageManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters the admin package list by the selected status', () => {
    const root = fixture.nativeElement as HTMLElement;
    const filterButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.getAttribute('aria-label') === 'Filter by status')!;

    expect(requestedStatuses.at(-1)).toBe('All');

    filterButton.click();
    fixture.detectChanges();
    const options = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    expect(options.map((option) => option.textContent?.trim())).toEqual(['All', 'Active', 'Inactive']);

    options.find((option) => option.textContent?.trim() === 'Active')?.click();
    fixture.detectChanges();
    expect(requestedStatuses.at(-1)).toBe('Active');
    expect(filterButton.textContent).toContain('Active');

    filterButton.click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('[role="menuitem"]:last-child')?.click();
    fixture.detectChanges();
    expect(requestedStatuses.at(-1)).toBe('Inactive');

    filterButton.click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('[role="menuitem"]:first-child')?.click();
    fixture.detectChanges();
    expect(requestedStatuses.at(-1)).toBe('All');
  });
});
