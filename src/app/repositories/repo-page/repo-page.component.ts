import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { Component } from '@angular/core';

@NgModule({
	schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})

@Component({
	selector: 'app-repo-page',
	templateUrl: './repo-page.component.html',
	styleUrls: ['./repo-page.component.scss']
})
export class RepoPageComponent {
}
