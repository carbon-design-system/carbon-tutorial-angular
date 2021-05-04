import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfoCardComponent } from './info-card.component';
import { InfoSectionComponent } from '../info-section/info-section.component';
import { RouterTestingModule } from '@angular/router/testing';
import { LinkModule, PaginationModule } from 'carbon-components-angular';
import { GridModule, TableModule } from 'carbon-components-angular';
import { UIShellModule } from 'carbon-components-angular';

describe('InfoCardComponent', () => {
  let component: InfoCardComponent;
  let fixture: ComponentFixture<InfoCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InfoCardComponent, InfoSectionComponent ],
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
    fixture = TestBed.createComponent(InfoCardComponent);
    component = fixture.componentInstance;
    // fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
