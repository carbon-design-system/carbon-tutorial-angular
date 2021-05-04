import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderModule } from 'carbon-components-angular';
import { HeaderComponent } from './header.component';
import { UIShellModule } from 'carbon-components-angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('TutorialHeaderComponent', () => {
	let component: HeaderComponent;
	let fixture: ComponentFixture<HeaderComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ HeaderComponent ],
			imports: [
				HeaderModule,
				UIShellModule,
				RouterTestingModule
			]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(HeaderComponent);
		component = fixture.componentInstance;
		//fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
