import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderModule } from 'carbon-components-angular/ui-shell/ui-shell.module';

import { HeaderComponent } from './header.component';

describe('TutorialHeaderComponent', () => {
	let component: HeaderComponent;
	let fixture: ComponentFixture<HeaderComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [HeaderComponent ],
			imports: [
				HeaderModule
			]
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
