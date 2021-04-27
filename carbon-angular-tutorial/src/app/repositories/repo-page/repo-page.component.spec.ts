import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';

describe('RepoPageComponent', () => {
  let component: RepoPageComponent;
  let fixture: ComponentFixture<RepoPageComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ RepoPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RepoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
