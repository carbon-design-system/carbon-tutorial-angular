import { Component, OnInit } from '@angular/core';

const config = require("./info.json");

@Component({
  selector: 'app-info-section',
  templateUrl: './info-section.component.html',
  styleUrls: ['./info-section.component.scss']
})
export class InfoSectionComponent implements OnInit {

  heading =  config.title;
  items = config.items;

  constructor() { }

  ngOnInit(): void {
  }

}
