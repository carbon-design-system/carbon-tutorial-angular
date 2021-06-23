import { Component, OnInit, HostBinding } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  // adds padding to the top of the document, so the content is below the header
  @HostBinding('class.bx--header') headerClass = true;

  constructor() { }

  ngOnInit() {
  }

}
