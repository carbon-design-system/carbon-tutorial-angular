import { Component, OnInit } from '@angular/core';
import { Apollo } from 'apollo-angular';

@Component({
	selector: 'app-repo-page',
	templateUrl: './repo-page.component.html',
	styleUrls: ['./repo-page.component.scss']
})
export class RepoPageComponent implements OnInit {

	constructor(private apollo: Apollo) { }

	ngOnInit() {
	}

}
