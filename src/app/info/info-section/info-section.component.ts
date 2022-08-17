import { Component, OnInit } from '@angular/core';
import { default as data } from '../info.json';
import { IconService } from "carbon-components-angular";
import PersonFavorite32 from '@carbon/icons/es/person--favorite/32.js';
import Application from '@carbon/icons/es/application/32.js';
import Globe from '@carbon/icons/es/globe/32.js';

@Component({
	selector: 'app-info-section',
	templateUrl: './info-section.component.html',
	styleUrls: ['./info-section.component.scss']
})
export class InfoSectionComponent implements OnInit {
	heading = data.title;
	items = data.items;

	constructor(protected iconService: IconService) {
	}

	ngOnInit(): void {
		this.iconService.registerAll(
			[PersonFavorite32, Application, Globe]
		);
	}

}
