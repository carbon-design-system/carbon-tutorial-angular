import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';
import { AppSwitcherModule, NotificationModule, UserAvatarModule } from '@carbon/icons-angular';

import { HeaderComponent } from './header/header.component';

@NgModule({
  declarations: [
    HeaderComponent,
  ],
  imports: [
    CommonModule,
    UIShellModule,
    NotificationModule,
    UserAvatarModule,
    AppSwitcherModule,
  ],
  exports: [
    HeaderComponent,
  ]
})
export class CoreModule { }
