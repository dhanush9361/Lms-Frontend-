import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
 
@Component({
  selector: 'app-create-role-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './create-role-modal.html',
  styleUrl: './create-role-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateRoleModal {
  readonly form = input.required<FormGroup>();
  readonly submitting = input(false);
  readonly editing = input(false);
  readonly error = input<string | null>(null);
 
  readonly cancelled = output<void>();
  readonly continued = output<void>();

  continue(): void {
    const roleName = this.form().controls['roleName'];
    if (this.form().invalid) {
      this.form().markAllAsTouched();
      return;
    }
    if (roleName.valid) this.continued.emit();
  }
 
  // Suggestions only (datalist); names are validated by the shared role form.
  readonly acceptedRoleNames = ['Admin', 'Instructor', 'Learner', 'Content Manager', 'Support Staff'];
}
 
