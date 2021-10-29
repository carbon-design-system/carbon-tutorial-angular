import { Component, HostBinding, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor() { }
  @HostBinding('class.bx--header') headerClass = true;
  ngOnInit(): void {
  }
}
