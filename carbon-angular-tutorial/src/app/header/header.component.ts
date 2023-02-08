import { Component, HostBinding } from '@angular/core';
import { IconService } from "carbon-components-angular";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  
  @HostBinding('class.cds--header') headerClass = true;
  
  constructor(protected iconService: IconService) {}
  
  ngOnInit() {
    this.iconService.registerAll([Notification]);
  }

}
