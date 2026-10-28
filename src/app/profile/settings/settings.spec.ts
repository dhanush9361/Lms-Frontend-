import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../services/auth';
import { PackageRecord, PackageService } from '../../services/package.service';
import { Settings } from './settings';

describe('Settings', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;
  let packageRecords: PackageRecord[];
  let assignedPackageIds: number[];
  const packageListQueries: { status?: string; page?: number; size?: number }[] = [];

  beforeEach(async () => {
    packageRecords = makePackages();
    assignedPackageIds = [3, 3, 3, 3, 3, 1];
    packageListQueries.length = 0;
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideRouter([]),
        {
          provide: PackageService,
          useValue: {
            list: (query: { status?: string; page?: number; size?: number } = {}) => {
              packageListQueries.push(query);
              const page = query.page ?? 0;
              return of({
                content: page === 0 ? packageRecords.slice(0, 8) : packageRecords.slice(8),
                totalPages: 2,
                number: page,
              });
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            listAdmins: () =>
              of({
                content: assignedPackageIds.map(makeAdmin),
                totalPages: 1,
                number: 0,
              }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  async function renderWithAssignments(packageIds: number[]): Promise<void> {
    fixture.destroy();
    assignedPackageIds = packageIds;
    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads all saved packages across pages without filtering by status', () => {
    expect(packageListQueries).toHaveLength(2);
    expect(packageListQueries.map(({ page }) => page)).toEqual([0, 1]);
    expect(packageListQueries.every(({ status }) => status === undefined)).toBe(true);
  });

  it('shows the saved Monthly packages returned by the package list', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('article')).toHaveLength(4);
    expect(Array.from(root.querySelectorAll('article')).every((article) => article.textContent?.includes('Monthly'))).toBe(true);
  });

  it('opens the details dialog from Manage Details', () => {
    const manageDetailsButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.trim() === 'Manage Details');

    expect(manageDetailsButton).toBeTruthy();
    manageDetailsButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Subscription Details');
    expect(fixture.nativeElement.textContent).toContain('Billing Details');
    expect(fixture.nativeElement.textContent).toContain('Start Date');
    expect(fixture.nativeElement.textContent).toContain('Expiry Date');
  });

  it('renders package catalog values and switches to yearly prices', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('Basic Package');
    expect(root.textContent).toContain('30');
    expect(root.textContent).toContain('Standard Package');
    expect(root.textContent).toContain('80');
    expect(root.textContent).toContain('Premium Package');
    expect(root.textContent).toContain('120');
    expect(root.textContent).toContain('Existing Package');
    expect(root.textContent).toContain('160');
    expect(root.querySelectorAll('article')).toHaveLength(4);
    expect(Array.from(root.querySelectorAll('article')).every((article) => article.textContent?.includes('Monthly'))).toBe(true);
    const plansContainer = root.querySelector<HTMLElement>('[aria-label="Available subscription plans"]')!;
    expect(plansContainer.classList.contains('bg-white')).toBe(true);
    expect(plansContainer.classList.contains('rounded-2xl')).toBe(true);
    expect(plansContainer.classList.contains('sm:ml-[52px]')).toBe(true);
    expect(plansContainer.classList.contains('sm:w-[calc(100%-52px)]')).toBe(true);

    const standardCard = root.querySelector('[aria-label="View details for Standard Package"]')?.closest('article');
    expect(standardCard?.classList.contains('bg-[#edf6f7]')).toBe(true);
    expect(Array.from(root.querySelectorAll('article')).filter((article) => article.textContent?.includes('Popular Plan')))
      .toHaveLength(0);
    const planTrack = standardCard?.parentElement;
    expect(planTrack?.classList.contains('overflow-y-hidden')).toBe(true);
    expect(planTrack?.classList.contains('pt-3')).toBe(true);
    expect(planTrack?.classList.contains('items-stretch')).toBe(true);
    expect(standardCard?.classList.contains('h-[clamp(420px,50vh,458px)]')).toBe(true);

    const yearlyButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Yearly');

    const monthlyButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Monthly');
    expect(monthlyButton?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('article .plan-price')?.textContent?.trim()).toBe('$30');
    yearlyButton?.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('$140');
    expect(root.textContent).toContain('$180');
    expect(root.textContent).toContain('$200');
    expect(root.textContent).toContain('Custom Team Package');
    expect(root.textContent).toContain('$260');
    expect(root.querySelectorAll('article')).toHaveLength(5);
    expect(Array.from(root.querySelectorAll('article')).every((article) => article.textContent?.includes('Yearly'))).toBe(true);
    root.querySelector<HTMLButtonElement>('[aria-label="View details for Custom Team Package"]')?.click();
    fixture.detectChanges();
    expect(root.querySelector('#subscription-panel')?.textContent).toContain('Custom team package details');
    expect(root.querySelector('#subscription-panel')?.textContent).toContain('Yearly');
    expect(root.querySelector('#subscription-panel')?.textContent).toContain('$260');
    expect(root.querySelector('article .plan-price')?.textContent?.trim()).toBe('$100');
    expect(yearlyButton?.getAttribute('aria-pressed')).toBe('true');

    monthlyButton?.click();
    fixture.detectChanges();
    expect(root.querySelector('article .plan-price')?.textContent?.trim()).toBe('$30');
    expect(monthlyButton?.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not show a popular badge when there are no package assignments', async () => {
    await renderWithAssignments([]);
    const root = fixture.nativeElement as HTMLElement;

    expect(Array.from(root.querySelectorAll('article')).filter((article) => article.textContent?.includes('Popular Plan')))
      .toHaveLength(0);
  });

  it('highlights only the most selected package among packages with the same price', async () => {
    packageRecords.find((item) => item.id === 5)!.price = 80;
    await renderWithAssignments([3, 3, 3, 5, 5]);
    const root = fixture.nativeElement as HTMLElement;
    const popularCards = Array.from(root.querySelectorAll('article')).filter((article) =>
      article.textContent?.includes('Popular Plan'),
    );

    expect(popularCards).toHaveLength(1);
    expect(popularCards[0].textContent).toContain('Standard Package');
    expect(popularCards[0].textContent).not.toContain('Premium Package');
  });

  it('does not highlight a package when same-price packages have tied selections', async () => {
    packageRecords.find((item) => item.id === 5)!.price = 80;
    await renderWithAssignments([3, 3, 5, 5]);
    const root = fixture.nativeElement as HTMLElement;

    expect(Array.from(root.querySelectorAll('article')).filter((article) => article.textContent?.includes('Popular Plan')))
      .toHaveLength(0);
  });

  it('displays raw package prices regardless of the selected currency', () => {
    const root = fixture.nativeElement as HTMLElement;
    const currencySelect = root.querySelector<HTMLSelectElement>('select')!;

    currencySelect.value = 'INR';
    currencySelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(root.querySelector('article p')?.textContent?.trim()).toBe('₹30');
    expect(root.textContent).toContain('Indian Rupee (INR ₹)');

    root.querySelector<HTMLButtonElement>('[aria-label="View details for Standard Package"]')?.click();
    fixture.detectChanges();
    expect(root.querySelector('#subscription-panel')?.textContent).toContain('₹80');
  });

  it('shows selected package details in the existing plan details popup', () => {
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[aria-label="View details for Standard Package"]')?.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('Package Name');
    expect(root.textContent).toContain('Standard Package');
    expect(root.textContent).toContain('The standard plan description');
    expect(root.textContent).toContain('Billing Cycle');
    expect(root.querySelector('#subscription-panel')?.textContent).toContain('$80');

    root.querySelector<HTMLButtonElement>('#billing-tab')?.click();
    fixture.detectChanges();
    expect(root.textContent).toContain('User Limit');
    expect(root.textContent).toContain('250');
    expect(root.textContent).toContain('Storage Limit');
    expect(root.textContent).toContain('500');
  });
});

function makePackages(): PackageRecord[] {
  const plans: PackageRecord['availablePackage'][] = ['Basic', 'Standard', 'Premium', 'Existing'];
  const monthlyPrices = [30, 80, 120, 160];
  const yearlyPrices = [100, 140, 180, 200];
  return [
    ...plans.flatMap((availablePackage, index) =>
      (['Monthly', 'Yearly'] as const).map((billingCycle, cycleIndex) => ({
        id: index * 2 + cycleIndex + 1,
        name: `${availablePackage} Package`,
        availablePackage,
        description: `The ${availablePackage.toLowerCase()} plan description`,
        price: cycleIndex === 0 ? monthlyPrices[index] : yearlyPrices[index],
        billingCycle,
        userLimit: 250,
        storageLimit: 500,
        status: 'Active' as const,
        createdAt: '2026-01-01T00:00:00Z',
        permissions: [
          {
            id: 'courses',
            name: 'Courses',
            enabled: true,
            features: [
              {
                id: 'create-course',
                name: 'Create courses',
                permissions: { create: true, read: true, update: false, delete: false },
              },
            ],
          },
        ],
      })),
    ),
    {
      id: 9,
      name: 'Custom Team Package',
      availablePackage: 'Standard',
      description: 'Custom team package details',
      price: 260,
      billingCycle: 'Yearly',
      userLimit: 80,
      storageLimit: 200,
      status: 'Active',
      createdAt: '2026-01-01T00:00:00Z',
      permissions: [],
    },
  ];
}

function makeAdmin(packageId: number) {
  return {
    id: packageId,
    username: `admin-${packageId}`,
    email: `admin-${packageId}@example.test`,
    role: 'ADMIN',
    status: 'Active' as const,
    packageId,
    packageExpiresAt: null,
    createdAt: '2026-01-01T00:00:00Z',
  };
}
