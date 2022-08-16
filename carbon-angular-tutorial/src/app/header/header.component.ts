import { Component, OnInit, HostBinding } from '@angular/core';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  @HostBinding('class.cds--header') headerClass = true;

  constructor() { }

  ngOnInit(): void {
  }

}
