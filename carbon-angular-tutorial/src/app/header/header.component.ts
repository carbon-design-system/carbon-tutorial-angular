import { Component, OnInit, HostBinding } from '@angular/core';
import { IconService } from "carbon-components-angular";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor(protected iconService: IconService) { }

  @HostBinding('class.cds--header') headerClass = true;

  ngOnInit() {
    this.iconService.registerAll([Notification]);
  }

}
