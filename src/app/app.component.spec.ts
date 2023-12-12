import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { IconModule, UIShellModule } from 'carbon-components-angular';
import { HomeModule } from './home/home.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { HeaderComponent } from './header/header.component';

describe('AppComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      declarations: [AppComponent, HeaderComponent],
      imports: [
        BrowserModule,
        AppRoutingModule,
        UIShellModule,
        IconModule,
        HomeModule,
        RepositoriesModule,
      ],
    })
  );

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
