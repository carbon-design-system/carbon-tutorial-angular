import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NotificationModule,AppSwitcherModule, UserAvatarModule } from '@carbon/icons-angular';
import { UIShellModule } from 'carbon-components-angular';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
const Icons = [
  NotificationModule,UserAvatarModule,AppSwitcherModule
];
describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,UIShellModule,...Icons,
      ],
      declarations: [
        AppComponent,HeaderComponent
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
