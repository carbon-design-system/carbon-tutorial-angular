import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderComponent } from './header.component';

import { RouterTestingModule } from '@angular/router/testing';
import { UIShellModule } from 'carbon-components-angular';

// import Notification16 from '@carbon/icons/es/notification/16';
// import UserAvatar16 from '@carbon/icons/es/user--avatar/16';
// import AppSwitcher16 from '@carbon/icons/es/app-switcher/16';

import { Component, HostBinding } from '@angular/core';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        UIShellModule
      ],
      declarations: [ HeaderComponent ]
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


//@HostBinding('class.bx--header') headerClass = true;