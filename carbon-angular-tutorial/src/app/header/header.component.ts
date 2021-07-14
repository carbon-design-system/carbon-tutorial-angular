import { Component, OnInit, HostBinding } from '@angular/core';
import { UIShellModule, IconModule, IconService } from 'carbon-components-angular';
import { AddModule } from '@carbon/icons-angular';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})

export class HeaderComponent implements OnInit {
  @HostBinding('class.bx--header') headerClass = true;

  constructor(protected iconService: IconService) {
    /*iconService.registerAll([
      Notification16
    ]);*/
  }

  ngOnInit(): void {
    console.log('ngOnInit');
  }

}

export class AppModule { 

}

