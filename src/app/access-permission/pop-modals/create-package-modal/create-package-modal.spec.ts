import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePackageModal } from './create-package-modal';

describe('CreatePackageModal', () => {
  let component: CreatePackageModal;
  let fixture: ComponentFixture<CreatePackageModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatePackageModal],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePackageModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('existingPackages', []);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates the description when the available package changes', () => {
    const root = fixture.nativeElement as HTMLElement;
    const packageSelect = root.querySelector<HTMLSelectElement>('select[aria-label="Available Package"]')!;
    const description = root.querySelector<HTMLTextAreaElement>('textarea[formControlName="description"]')!;

    for (const [plan, expectedDescription] of [
      ['Basic', 'Best for Beginners'],
      ['Standard', 'Essential Features for Growing Teams'],
      ['Premium', 'Advanced Features for Growing Business'],
    ]) {
      packageSelect.value = plan;
      packageSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(description.value).toBe(expectedDescription);
    }
  });
});
