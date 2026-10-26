import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

const ROLE_NAME_EMOJI_PATTERN = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{1F3FB}-\u{1F3FF}]|[#*0-9]\uFE0F?\u20E3/u;

function noEmojiValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '') as string;
  return ROLE_NAME_EMOJI_PATTERN.test(value) ? { emoji: true } : null;
}

function notOnlyWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '') as string;
  return value.length > 0 && value.trim().length === 0 ? { whitespace: true } : null;
}

function duplicateRoleNameValidator(existingNames: () => string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = ((control.value ?? '') as string).trim().toLowerCase();
    if (!value) {
      return null;
    }
    const clashes = existingNames().some((name) => name.trim().toLowerCase() === value);
    return clashes ? { duplicateRoleName: true } : null;
  };
}

export function buildRoleForm(fb: FormBuilder, existingNames: () => string[]): FormGroup {
  return fb.group({
    roleName: [
      '',
      [
        Validators.required,
        noEmojiValidator,
        notOnlyWhitespaceValidator,
        Validators.minLength(4),
        Validators.maxLength(50),
        duplicateRoleNameValidator(existingNames),
      ],
    ],
  });
}

/**
 * CHANGED: 'category' (a role NAME typed/selected as free text) replaced
 * with 'roleId' (number | null) so the invite payload matches
 * InviteDto.SendRequest.roleId on the backend exactly.
 */
export function buildInviteForm(fb: FormBuilder): FormGroup {
  return fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    roleId: [null as number | null, [Validators.required]],
  });
}
