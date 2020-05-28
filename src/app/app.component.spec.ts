import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import {
	NotificationModule,
	UserAvatarModule,
	AppSwitcherModule
} from '@carbon/icons-angular';

import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

describe('AppComponent', () => {
	beforeEach(async(() => {
		TestBed.configureTestingModule({
			imports: [
				RouterTestingModule,
				NotificationModule,
				UserAvatarModule,
				AppSwitcherModule
			],
			declarations: [
				AppComponent,
				HeaderComponent,
			],
		}).compileComponents();
	}));

	it('should create the app', () => {
		const fixture = TestBed.createComponent(AppComponent);
		const app = fixture.componentInstance;
		expect(app).toBeTruthy();
	});
});
