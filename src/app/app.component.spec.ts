import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';

// import icons
// import { NotificationModule, UserAvatarModule, AppSwitcherModule } from '@carbon/icons-angular';

import { Notification20Module } from '@carbon/icons-angular/lib/notification/20';
import { UserAvatar20Module } from '@carbon/icons-angular/lib/user--avatar/20';
import { AppSwitcher20Module } from '@carbon/icons-angular/lib/app-switcher/20';

import { HeaderComponent } from './header/header.component';

describe('AppComponent', () => {
	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				RouterTestingModule,
				UIShellModule,
				Notification20Module,
				UserAvatar20Module,
				AppSwitcher20Module
			],
			declarations: [
				AppComponent,
				HeaderComponent
			],
		}).compileComponents();
	});

	it('should create the app', () => {
		const fixture = TestBed.createComponent(AppComponent);
		const app = fixture.componentInstance;
		expect(app).toBeTruthy();
	});
});
