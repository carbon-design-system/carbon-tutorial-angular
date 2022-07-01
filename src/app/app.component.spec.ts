import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { UIShellModule } from 'carbon-components-angular';
import Notification20 from '@carbon/icons/es/notification/20';
import UserAvatar20 from '@carbon/icons/es/user--avatar/20';
import AppSwitcher20 from '@carbon/icons/es/app-switcher/20';
// import { Notification20Module } from '@carbon/icons-angular/lib/notification/20';
// import { UserAvatar20Module } from '@carbon/icons-angular/lib/user--avatar/20';
// import { AppSwitcher20Module } from '@carbon/icons-angular/lib/app-switcher/20';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

describe('AppComponent', () => {
	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [
				AppComponent,
				HeaderComponent
			],
			imports: [
				RouterTestingModule,
				UIShellModule,
				Notification20,
				UserAvatar20,
				AppSwitcher20
			]
		}).compileComponents();
	}));

	it('should create the app', async(() => {
		const fixture = TestBed.createComponent(AppComponent);
		const app = fixture.debugElement.componentInstance;
		expect(app).toBeTruthy();
	}));
});

TestBed.configureTestingModule({
	declarations: [HeaderComponent],
	imports: [UIShellModule]
  });