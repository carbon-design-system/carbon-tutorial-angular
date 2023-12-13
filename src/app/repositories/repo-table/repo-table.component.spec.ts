import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoTableComponent } from './repo-table.component';
import {
	GridModule,
	LinkModule,
	PaginationModule,
	TableModule,
} from 'carbon-components-angular';
import { CommonModule } from '@angular/common';
import { RepositoriesRoutingModule } from '../repositories-routing.module';
import { RepoPageComponent } from '../repo-page/repo-page.component';
import { Apollo } from 'apollo-angular';

describe('RepoTableComponent', () => {
	let component: RepoTableComponent;
	let fixture: ComponentFixture<RepoTableComponent>;

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
		fixture = TestBed.createComponent(RepoTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});
});
