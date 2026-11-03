import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BulkUser } from './bulk-user';

describe('BulkUser', () => {
  let component: BulkUser;
  let fixture: ComponentFixture<BulkUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkUser],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkUser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
