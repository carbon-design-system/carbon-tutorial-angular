import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';
import { TestBed} from '@angular/core/testing';
import { HeaderComponent } from './header.component';

import Notification16 from '@carbon/icons/es/notification/16';
import UserAvatar16 from '@carbon/icons/es/user--avatar/16';
import AppSwitcher16 from '@carbon/icons/es/app-switcher/16';

TestBed.configureTestingModule({
  declarations: [HeaderComponent],
  imports: [UIShellModule]
});