import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

import { TutorialHeaderComponent } from "./tutorial-header/tutorial-header.component";

import { HeaderModule } from "carbon-components-angular";
import { Notification20Module } from "@carbon/icons-angular/lib/notification/20";
import { UserAvatar20Module } from "@carbon/icons-angular/lib/user--avatar/20";
import { AppSwitcher20Module } from "@carbon/icons-angular/lib/app-switcher/20";

export { TutorialHeaderComponent } from "./tutorial-header/tutorial-header.component";

@NgModule({
	declarations: [TutorialHeaderComponent],
	imports: [
		CommonModule,
		HeaderModule,
		Notification20Module,
		UserAvatar20Module,
		AppSwitcher20Module,
		RouterModule
	],
	exports: [
		TutorialHeaderComponent
	]
})
export class TutorialHeaderModule { }
