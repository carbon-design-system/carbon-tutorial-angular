import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { UIShellModule } from 'carbon-components-angular';
import { HeaderComponent } from './header.component';

// import Notification16 from '@carbon/icons/es/notification/16';
// import UserAvatar16 from '@carbon/icons/es/user--avatar/16';
// import AppSwitcher16 from '@carbon/icons/es/app-switcher/16';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HeaderComponent ],
      imports: [UIShellModule]
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
