import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoSectionComponent } from './info-section.component';
import { GridModule } from 'carbon-components-angular';
import { ApplicationModule, PersonFavoriteModule, GlobeModule } from '@carbon/icons-angular';
import { InfoCardComponent } from '../info-card/info-card.component';

describe('InfoSectionComponent', () => {
	let component: InfoSectionComponent;
	let fixture: ComponentFixture<InfoSectionComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ InfoSectionComponent, InfoCardComponent ],
			imports: [
				GridModule,
				PersonFavoriteModule,
				GlobeModule,
				ApplicationModule
			]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(InfoSectionComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
