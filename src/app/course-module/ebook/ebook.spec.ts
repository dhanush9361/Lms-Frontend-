import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ebook } from './ebook';

describe('Ebook', () => {
  let component: Ebook;
  let fixture: ComponentFixture<Ebook>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ebook],
    }).compileComponents();

    fixture = TestBed.createComponent(Ebook);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
