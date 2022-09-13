import { Component, HostBinding, OnInit } from '@angular/core';
import Notification20 from '@carbon/icons/es/notification/20';
import Switcher20 from '@carbon/icons/es/switcher/20';
import UserAvatar from '@carbon/icons/es/user--avatar/20';

import { IconService } from "carbon-components-angular";

@Component({
	selector: 'app-header',
	templateUrl: './header.component.html',
	styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
	// adds padding to the top of the document, so the content is below the header
	@HostBinding('class.bx--header') headerClass = true;

	constructor(protected iconService: IconService) {}

	ngOnInit() {
		this.iconService.registerAll([Notification20, Switcher20, UserAvatar]);
	}
}
