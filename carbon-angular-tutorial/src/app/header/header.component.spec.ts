import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UIShellModule } from 'carbon-components-angular';
import { IconModule } from '@carbon/icons';
import { HeaderComponent } from './header.component';
import { USED_CARBON_ICONS } from '../app.const';

const icons = USED_CARBON_ICONS;

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ 
        HeaderComponent
       ],
      imports: [
        UIShellModule,
        UIShellModule,
        IconModule
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
