import { Component, OnInit } from '@angular/core';
import { HostBinding } from '@angular/core';



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  @HostBinding('class.bx--header') headerClass = true;

  constructor() { }

  ngOnInit(): void {
  }

}
