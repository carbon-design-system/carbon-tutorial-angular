import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderComponent } from './header.component';
import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';
import { NotificationModule } from '@carbon/icons-angular/notification';
import { UserAvatarModule } from '@carbon/icons-angular/user--avatar';
import { AppSwitcherModule } from '@carbon/icons-angular/app-switcher';


describe('HeaderComponent', () => {
	let component: HeaderComponent;
	let fixture: ComponentFixture<HeaderComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ HeaderComponent ],
			imports: [ UIShellModule, NotificationModule, UserAvatarModule, AppSwitcherModule ]
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
