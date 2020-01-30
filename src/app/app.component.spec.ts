import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { UIShellModule } from 'carbon-components-angular';
import { GraphQLModule } from './graphql.module';

describe('AppComponent', () => {
	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [
				AppComponent, HeaderComponent
			],
			imports: [
				RouterTestingModule,
				UIShellModule,
				GraphQLModule
			]
		}).compileComponents();
	}));

	it('should create the app', async(() => {
		const fixture = TestBed.createComponent(AppComponent);
		const app = fixture.debugElement.componentInstance;
		expect(app).toBeTruthy();
	}));
});
