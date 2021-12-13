import { Component, HostBinding } from '@angular/core';
  
  @HostBinding('class.bx--header') headerClass = true;


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
