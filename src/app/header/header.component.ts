import { Component, OnInit, HostBinding } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor() {
    console.log('foo');
  }

  ngOnInit(): void {
    console.log('foo');
  }

  @HostBinding('class.bx--header') headerClass = true;

}
