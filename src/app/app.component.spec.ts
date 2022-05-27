import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AppSwitcherModule, NotificationModule, UserAvatarModule } from '@carbon/icons-angular';
import { HeaderComponent } from './header/header.component';
import { UIShellModule } from 'carbon-components-angular';
  
  describe('AppComponent', () => {
    beforeEach(async(() => {
      TestBed.configureTestingModule({
        declarations: [
          AppComponent,
          HeaderComponent
        ],
        imports: [
          RouterTestingModule,
          UIShellModule,
          NotificationModule,
          UserAvatarModule,
          AppSwitcherModule
        ]
      }).compileComponents();
    }));
  
    it('should create the app', async(() => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.debugElement.componentInstance;
      expect(app).toBeTruthy();
    }));
  });