import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoTableComponent } from './repo-table.component';

describe('RepoTableComponent', () => {
  let component: RepoTableComponent;
  let fixture: ComponentFixture<RepoTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RepoTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepoTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
