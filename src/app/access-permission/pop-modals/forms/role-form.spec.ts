import { FormBuilder } from '@angular/forms';

import { buildRoleForm } from './role-form';

describe('Role Name validation', () => {
  const form = buildRoleForm(new FormBuilder(), () => []);
  const roleName = form.controls['roleName'];

  beforeEach(() => {
    form.reset({ roleName: '' });
  });

  it('accepts special characters such as Admin@#$%', () => {
    roleName.setValue('Admin@#$%');
    expect(roleName.valid).toBe(true);
  });

  it('accepts Admin123', () => {
    roleName.setValue('Admin123');
    expect(roleName.valid).toBe(true);
  });

  it('rejects Admin😀 with the emoji validation error', () => {
    roleName.setValue('Admin😀');
    expect(roleName.hasError('emoji')).toBe(true);
    expect(roleName.valid).toBe(false);
  });

  it('rejects emojis surrounded by allowed special characters', () => {
    roleName.setValue('Admin@#😀$%');
    expect(roleName.hasError('emoji')).toBe(true);
    expect(roleName.valid).toBe(false);
  });
});
