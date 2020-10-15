import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';
import { NotificationModule } from '@carbon/icons-angular/';
import { UserAvatarModule } from '@carbon/icons-angular/';
import { AppSwitcherModule } from '@carbon/icons-angular/';

describe('AppComponent', () => {
	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				RouterTestingModule,
				UIShellModule,
				NotificationModule,
				UserAvatarModule,
				AppSwitcherModule
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
