import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AppSwitcherModule, NotificationModule, UserAvatarModule } from '@carbon/icons-angular';
import { HeaderComponent } from './header/header.component';
import { UIShellModule } from 'carbon-components-angular';


describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        UIShellModule,
        NotificationModule,
        AppSwitcherModule,
        UserAvatarModule,
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

  it(`should have as title 'carbon-angular-tutorial'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('carbon-angular-tutorial');
  });
});
