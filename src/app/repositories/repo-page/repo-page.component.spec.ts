import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';
import {
	GridModule,
	LinkModule,
	PaginationModule,
	TableModule,
} from 'carbon-components-angular';
import { RepoTableComponent } from '../repo-table/repo-table.component';
import { CommonModule } from '@angular/common';
import { RepositoriesRoutingModule } from '../repositories-routing.module';
import { Apollo } from 'apollo-angular';

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [RepoPageComponent, RepoTableComponent],
			imports: [
				CommonModule,
				RepositoriesRoutingModule,
				GridModule,
				TableModule,
				LinkModule,
				PaginationModule,
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(RepoPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});
});
