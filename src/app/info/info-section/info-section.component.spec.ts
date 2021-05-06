import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfoSectionComponent } from './info-section.component';
import { InfoCardComponent } from '../info-card/info-card.component';
import { RouterTestingModule } from '@angular/router/testing';
import { LinkModule, PaginationModule } from 'carbon-components-angular';
import { GridModule, TableModule } from 'carbon-components-angular';
import { UIShellModule } from 'carbon-components-angular';

describe('InfoSectionComponent', () => {
  let component: InfoSectionComponent;
  let fixture: ComponentFixture<InfoSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InfoSectionComponent, InfoCardComponent ],
      imports: [
				RouterTestingModule,
				TableModule,
				LinkModule,
				PaginationModule,
				GridModule,
				UIShellModule
			]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoSectionComponent);
    component = fixture.componentInstance;
    // fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
