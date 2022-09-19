import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoCardComponent } from './info-card/info-card.component';
import { InfoSectionComponent } from './info-section/info-section.component';
import { GridModule ,  IconModule, IconService } from "carbon-components-angular";
import PersonFavorite32 from "@carbon/icons/es/person--favorite/32";
import Globe32 from "@carbon/icons/es/globe/32";
import Application32 from "@carbon/icons/es/application/32";


@NgModule({
  declarations: [
    InfoCardComponent,
    InfoSectionComponent
  ],
  imports: [
    CommonModule,
    GridModule,
    IconModule
  ],
  exports: [InfoCardComponent, InfoSectionComponent],
  providers: [
    IconService
  ]
})
export class InfoModule {
  constructor(protected iconService: IconService) {
    iconService.registerAll([
      PersonFavorite32,
      Globe32,
      Application32,
    ]);
  }
}
