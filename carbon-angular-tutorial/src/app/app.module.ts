// default angular imports
import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";

// project components imports
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { HeaderComponent } from "./header/header.component";

// carbon-components-angular default imports
import { UIShellModule, IconModule, IconService } from "carbon-components-angular";
import Notification16 from "@carbon/icons/es/notification/16";
import UserAvatar16 from "@carbon/icons/es/user--avatar/16";
import AppSwitcher16 from "@carbon/icons/es/app-switcher/16";

@NgModule({
    declarations: [AppComponent, HeaderComponent],
    imports: [BrowserModule, AppRoutingModule, UIShellModule, IconModule],
    bootstrap: [AppComponent],
})
export class AppModule {
    constructor(protected iconService: IconService) {
        iconService.registerAll([Notification16, UserAvatar16, AppSwitcher16]);
    }
}
