import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';
import { Notification20Module } from '@carbon/icons-angular/lib/notification/20';
import { UserAvatar20Module } from '@carbon/icons-angular/lib/user--avatar/20';
import { AppSwitcher20Module } from '@carbon/icons-angular/lib/app-switcher/20';
import { Component, HostBinding } from '@angular/core';
import { HeaderComponent } from './header.component';
import { UIShellModule } from 'carbon-components-angular';

describe('HeaderComponent', () => {
	let component: HeaderComponent;
	let fixture: ComponentFixture<HeaderComponent>;
 @HostBinding('class.bx--header') headerClass = true;
	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ HeaderComponent ],
			imports: [Notification20Module, UserAvatar20Module, AppSwitcher20Module];

		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(HeaderComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
