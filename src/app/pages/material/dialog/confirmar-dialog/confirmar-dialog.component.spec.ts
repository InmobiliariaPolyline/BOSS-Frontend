import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmarDialogComponent } from './confirmar-dialog.component';

describe('ConfirmarDialogComponent', () => {
  let component: ConfirmarDialogComponent;
  let fixture: ComponentFixture<ConfirmarDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmarDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
