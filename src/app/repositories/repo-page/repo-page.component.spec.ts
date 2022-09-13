import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';
import { GridModule, TableModule } from "carbon-components-angular";
import { Component } from "@angular/core";

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoPageComponent, RepoTableMockComponent ],
			imports: [GridModule,TableModule]
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

@Component({
	selector: 'app-repo-table',
	template: `<p>whatever</p>`
})
class RepoTableMockComponent {}
