import { NgModule } from '@angular/core';
import { Component } from '@angular/core';
import { GridModule, TableModule } from 'carbon-components-angular';

@Component({
	selector: 'app-repo-page',
	templateUrl: './repo-page.component.html',
	styleUrls: ['./repo-page.component.scss']
})

@NgModule({
	declarations: [RepoPageComponent],
	imports: [
		GridModule,
		TableModule
	]
})
export class RepoPageComponent {
}
