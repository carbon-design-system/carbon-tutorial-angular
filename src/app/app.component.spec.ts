import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';
import { TestBed} from '@angular/core/testing';
import { HeaderComponent } from './header/header.component';
import Notification20 from '@carbon/icons/es/notification/20';
import UserAvatar20 from '@carbon/icons/es/user--avatar/20';
import AppSwitcher20 from '@carbon/icons/es/app-switcher/20';

TestBed.configureTestingModule({
  declarations: [HeaderComponent],
  imports: [UIShellModule]
});