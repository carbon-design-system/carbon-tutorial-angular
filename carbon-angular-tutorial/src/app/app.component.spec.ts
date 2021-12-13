import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';

import { Notification16 } from '@carbon/icons/es/notification/16';
import { UserAvatar16 } from '@carbon/icons/es/user--avatar/16';
import { AppSwitcher16 } from '@carbon/icons/es/app-switcher/16';

import { HeaderComponent } from './header/header.component';

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

  it(`should have as title 'carbon-angular-tutorial'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('carbon-angular-tutorial');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.content span')?.textContent).toContain('carbon-angular-tutorial app is running!');
  });
});
