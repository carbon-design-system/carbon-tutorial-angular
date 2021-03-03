import { async, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import {
	AppSwitcherModule,
	NotificationModule,
	UserAvatarModule,
} from '@carbon/icons-angular';
import { UIShellModule } from 'carbon-components-angular';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

describe('AppComponent', () => {
	beforeEach(async(() => {
		TestBed.configureTestingModule({
			imports: [
				RouterTestingModule,
				UIShellModule,
				NotificationModule,
				UserAvatarModule,
				AppSwitcherModule,
			],
			declarations: [AppComponent, HeaderComponent],
		}).compileComponents();
	}));

	it('should create the app', () => {
		const fixture = TestBed.createComponent(AppComponent);
		const app = fixture.debugElement.componentInstance;
		expect(app).toBeTruthy();
	});
});
