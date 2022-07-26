import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
// carbon-components-angular default imports
import { IconModule, UIShellModule } from 'carbon-components-angular';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, UIShellModule, IconModule],
      declarations: [AppComponent, HeaderComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
