import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationModule, UserAvatarModule, AppSwitcherModule } from '@carbon/icons-angular';
import { UIShellModule } from 'carbon-components-angular';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HeaderComponent ],
      imports: [
        UIShellModule,
        NotificationModule,
        UserAvatarModule,
        AppSwitcherModule,
      ],
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
