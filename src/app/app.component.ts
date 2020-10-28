import { Component, HostBinding } from '@angular/core';
import { HeaderComponent } from './header/header.component';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {

	declarations: [HeaderComponent];

	@HostBinding('class.bx--header') headerClass = true;

}
