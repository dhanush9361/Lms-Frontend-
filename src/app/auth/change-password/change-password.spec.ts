import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangePassword } from './change-password';

describe('ChangePassword', () => {
  let component: ChangePassword;
  let fixture: ComponentFixture<ChangePassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePassword],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePassword);
    component = fixture.componentInstance;
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = () => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    };
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect((fixture.nativeElement.querySelector('dialog') as HTMLDialogElement).open).toBe(true);
  });

  it('toggles visibility for each password field independently', () => {
    const currentPasswordInput = fixture.nativeElement.querySelector('#current-password') as HTMLInputElement;
    const newPasswordInput = fixture.nativeElement.querySelector('#new-password') as HTMLInputElement;
    const confirmPasswordInput = fixture.nativeElement.querySelector('#confirm-password') as HTMLInputElement;
    const showCurrentPassword = fixture.nativeElement.querySelector(
      'button[aria-label="Show current password"]',
    ) as HTMLButtonElement;
    const showNewPassword = fixture.nativeElement.querySelector(
      'button[aria-label="Show new password"]',
    ) as HTMLButtonElement;

    showCurrentPassword.click();
    fixture.detectChanges();
    showNewPassword.click();
    fixture.detectChanges();

    expect(currentPasswordInput.type).toBe('text');
    expect(newPasswordInput.type).toBe('text');
    expect(confirmPasswordInput.type).toBe('password');

    const showConfirmPassword = fixture.nativeElement.querySelector(
      'button[aria-label="Show confirmation password"]',
    ) as HTMLButtonElement;
    showConfirmPassword.click();
    fixture.detectChanges();

    expect(newPasswordInput.type).toBe('text');
    expect(confirmPasswordInput.type).toBe('text');
  });

  it('rejects new and confirmation passwords that do not match', () => {
    const values = [
      ['#current-password', 'CurrentPass1!'],
      ['#new-password', 'NewPassword1!'],
      ['#confirm-password', 'DifferentPass2!'],
    ];

    for (const [selector, value] of values) {
      const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('The passwords do not match.');
  });
});
