import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderComponent } from './header.component';

import { UIShellModule } from 'carbon-components-angular';

import { NotificationModule, UserAvatarModule, AppSwitcherModule } from '@carbon/icons-angular';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(() => {
      TestBed.configureTestingModule({
      declarations: [
        HeaderComponent
      ],
      imports: [
        UIShellModule,
        NotificationModule,
        UserAvatarModule,
        AppSwitcherModule
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

