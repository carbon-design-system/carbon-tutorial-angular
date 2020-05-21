import { Component, HostBinding } from '@angular/core';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {
	@HostBinding('class.bx--content') headerClass = true;
	title = 'carbon-angular-tutorial';
}
