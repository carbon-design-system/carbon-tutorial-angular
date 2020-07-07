import { Component, NgModule } from '@angular/core';
import { GridModule, TableModule } from 'carbon-components-angular';
import { RepoTableComponent } from '../repo-table/repo-table.component';


@Component({
	selector: 'app-repo-page',
	templateUrl: './repo-page.component.html',
	styleUrls: ['./repo-page.component.scss']
})
@NgModule ({
	declarations: [ RepoPageComponent, RepoTableComponent ],
	imports: [GridModule, TableModule]
})

export class RepoPageComponent {
}
