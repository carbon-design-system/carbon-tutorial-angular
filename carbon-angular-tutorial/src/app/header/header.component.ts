import { Component, Host, HostBinding, OnInit } from '@angular/core';
import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';
import { USED_CARBON_ICONS } from '../app.const';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @HostBinding('class.bx--header') headerClass = true;
  constructor() { }

  ngOnInit(): void {
  }

}
