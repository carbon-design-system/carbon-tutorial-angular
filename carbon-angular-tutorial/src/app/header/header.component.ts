import { Component, HostBinding, OnInit } from '@angular/core';
import { IconService } from 'carbon-components-angular';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor(protected iconService: IconService) { }

  @HostBinding('class.bx--header') headerClass = true;

  ngOnInit(): void {
  }

}
