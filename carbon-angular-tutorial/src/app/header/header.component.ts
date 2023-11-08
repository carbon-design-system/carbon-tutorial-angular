import { IconService } from "carbon-components-angular";
import { IconModule } from "carbon-components-angular";

import Notification20 from '@carbon/icons/es/notification/20';

import { Component, OnInit, HostBinding } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [IconModule]
})
export class HeaderComponent implements OnInit {
  constructor(protected iconService: IconService) {
    // Constructor
  }
  ngOnInit() {
    // This method will be executed when the component is initialized
    this.iconService.registerAll([Notification20]);
  }
  @HostBinding('class.cds--header') headerClass = true;
}
