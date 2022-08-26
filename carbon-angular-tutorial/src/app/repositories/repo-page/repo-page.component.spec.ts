import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';

import { GridModule, TableModule } from 'carbon-components-angular';

import { RepoTableComponent } from '../repo-table/repo-table.component';

describe('RepoPageComponent', () => {
  let component: RepoPageComponent;
  let fixture: ComponentFixture<RepoPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RepoPageComponent, RepoTableComponent ],
      imports: [ GridModule, TableModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
