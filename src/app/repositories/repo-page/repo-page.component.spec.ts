import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';
import { GridModule, TableModule } from 'carbon-components-angular';
import { Component } from "@angular/core";

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(fakeAsync(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoPageComponent, RepoTableComponent ],
			imports: [
				GridModule,
				TableModule
			]
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
	template: '<p>whatever</p>',
	selector: 'app-repo-table'
})
class RepoTableComponent {

}
