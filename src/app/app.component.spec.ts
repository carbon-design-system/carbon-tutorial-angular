import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { UIShellModule } from 'carbon-components-angular';
import { HeaderComponent } from './header/header.component';
import { NotificationModule, UserAvatarModule, AppSwitcherModule } from '@carbon/icons-angular';


describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        UIShellModule,
        NotificationModule,
        UserAvatarModule,
        AppSwitcherModule,
      ],
      declarations: [
        AppComponent,
        HeaderComponent
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
  TestBed.configureTestingModule({
    declarations: [HeaderComponent],
    imports: [UIShellModule]
  });
});
