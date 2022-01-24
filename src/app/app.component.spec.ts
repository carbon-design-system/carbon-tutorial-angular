import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';
import { HeaderComponent } from './header/header.component';
import { AppSwitcherModule, UserAvatarModule, NotificationModule } from "@carbon/icons-angular";


describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      imports: [UIShellModule]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });  
});
