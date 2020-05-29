import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { UIShellModule } from 'carbon-components-angular';
import {
	NotificationModule,
	UserAvatarModule,
	AppSwitcherModule
} from '@carbon/icons-angular';

import { HeaderComponent } from './header.component';

TestBed.configureTestingModule({
	declarations: [HeaderComponent],
	imports: [
		UIShellModule,
		NotificationModule,
		UserAvatarModule,
		AppSwitcherModule
	]
	});

describe('HeaderComponent', () => {
	let component: HeaderComponent;
	let fixture: ComponentFixture<HeaderComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ HeaderComponent ]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(HeaderComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
