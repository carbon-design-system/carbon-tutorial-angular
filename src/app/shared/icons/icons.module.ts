import { NgModule } from "@angular/core";

import { NotificationModule, UserAvatarModule, AppSwitcherModule } from '@carbon/icons-angular';

@NgModule({
    imports:[NotificationModule, UserAvatarModule, AppSwitcherModule],
    exports:[NotificationModule, UserAvatarModule, AppSwitcherModule]
})
export class IconsModule {}