import { Component, HostBinding, OnInit } from '@angular/core';
import { IconService } from 'carbon-components-angular';



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  //@HostBinding('class.cds--header') headerClass = true;

  @HostBinding('class.bx--header') headerClass = true;

  constructor(protected iconService: IconService) {
  }

  ngOnInit(): void {
    console.log('');
  }

}
