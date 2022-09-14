import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GridModule, TableModule, LinkModule, PaginationModule } from 'carbon-components-angular';
import {
  ApolloTestingModule,
} from 'apollo-angular/testing';
import { Apollo } from 'apollo-angular'
import { RepoTableComponent } from './repo-table.component';

describe('RepoTableComponent', () => {
  let component: RepoTableComponent;
  let fixture: ComponentFixture<RepoTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RepoTableComponent],
      imports: [
        GridModule,
        TableModule,
        LinkModule,
        PaginationModule,
        ApolloTestingModule

      ],
      providers: [Apollo]

    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RepoTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
