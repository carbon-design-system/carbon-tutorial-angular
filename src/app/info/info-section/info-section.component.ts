import { Component, OnInit } from '@angular/core';
import * as data from '../info';
import { IconService } from 'carbon-components-angular';
import Notification20 from '@carbon/icons/es/notification/20';
import PersonFavorite32 from '@carbon/icons/es/person--favorite/32';
import Globe32 from '@carbon/icons/es/globe/32';
import Application32 from '@carbon/icons/lib/application/32';

@Component({
  selector: 'app-info-section',
  templateUrl: './info-section.component.html',
  styleUrls: ['./info-section.component.scss']
})
export class InfoSectionComponent implements OnInit {
  heading = data.info.title;
  items = data.info.items;
  constructor(protected iconservice: IconService) {
		iconservice.registerAll([
      Notification20,
      PersonFavorite32,
      Globe32,
      Application32
		]);
	  }

  ngOnInit(): void {
  }

}
