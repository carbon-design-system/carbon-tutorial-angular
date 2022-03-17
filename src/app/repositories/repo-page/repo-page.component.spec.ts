import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RepoTableComponent } from '../repo-table/repo-table.component';

import { RepoPageComponent } from './repo-page.component';

describe('RepoPageComponent', () => {
  let component: RepoPageComponent;
  let fixture: ComponentFixture<RepoPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RepoPageComponent, RepoTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RepoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
