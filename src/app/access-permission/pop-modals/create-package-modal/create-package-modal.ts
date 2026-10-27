import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { buildPackageDetailsForm, wordCountOf } from '../forms/package-form';
import { AVAILABLE_PACKAGE_OPTIONS, PackagePayload, PackageRecord } from '../../../services/package.service';


@Component({
  selector: 'app-create-package-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './create-package-modal.html',
  styleUrl: './create-package-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePackageModal implements OnChanges {
  /** Existing packages, for the client-side duplicate-name check. */
  @Input({ required: true }) existingPackages: readonly PackageRecord[] = [];
  @Input() editing: PackageRecord | null = null;
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly next = new EventEmitter<PackagePayload>();

  protected readonly availablePackageOptions = AVAILABLE_PACKAGE_OPTIONS;
  protected readonly form = buildPackageDetailsForm(
    () => this.existingPackages,
    () => this.editing?.id ?? null,
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editing']) {
      this.reset();
    }

    if (changes['existingPackages'] && !changes['editing']) {
      this.form.controls.name.updateValueAndValidity({ emitEvent: false });
    }
  }

  protected descriptionWordCount(): number {
    return wordCountOf(this.form.controls.description.value);
  }

  protected updateDescription(): void {
    const descriptions: Partial<Record<PackagePayload['availablePackage'], string>> = {
      Basic: 'Best for Beginners',
      Standard: 'Essential Features for Growing Teams',
      Premium: 'Advanced Features for Growing Business',
    };
    const availablePackage = this.form.controls.availablePackage.value as PackagePayload['availablePackage'];
    this.form.controls.description.setValue(descriptions[availablePackage] ?? '');
  }

  protected onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    this.next.emit({
      name: value.name.trim(),
      availablePackage: value.availablePackage as PackagePayload['availablePackage'],
      description: value.description.trim() || null,
      price: value.price!,
      billingCycle: value.billingCycle as PackagePayload['billingCycle'],
      userLimit: value.userLimit!,
      storageLimit: value.storageLimit,
      permissions: [],
    });
  }

  /** Called by the container after a successful create, or on reopen. */
  reset(): void {
    const item = this.editing;
    this.form.reset(
      item
        ? {
            name: item.name,
            availablePackage: item.availablePackage,
            description: item.description ?? '',
            price: item.price,
            billingCycle: item.billingCycle,
            userLimit: item.userLimit,
            storageLimit: item.storageLimit,
          }
        : undefined,
    );
  }

  /**
   * Surfaces a server-side 409 (duplicate name) back onto the name field
   * without the component needing to know anything about HTTP.
   */
  markNameAsDuplicate(): void {
    const control = this.form.controls.name;
    control.setErrors({ ...control.errors, packageNameExists: true });
    control.markAsTouched();
  }
}