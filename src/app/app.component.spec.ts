import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';
import { AppSwitcherModule } from '@carbon/icons-angular';
import { HeaderComponent } from './header/header.component';
import { NotificationModule } from '@carbon/icons-angular';
import { UserAvatarModule } from '@carbon/icons-angular';
import { UIShellModule } from 'carbon-components-angular';

describe('AppComponent', () => {
	beforeEach(async(() => {
		TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        AppSwitcherModule,
        NotificationModule,
        UIShellModule,
        UserAvatarModule,
      ],
      declarations: [
        AppComponent,
        HeaderComponent],
    }).compileComponents();
	}));

	it('should create the app', () => {
		const fixture = TestBed.createComponent(AppComponent);
		const app = fixture.componentInstance;
		expect(app).toBeTruthy();
	});

});