import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoCardComponent } from './info-card/info-card.component';
import { InfoSectionComponent } from './info-section/info-section.component';

import { GridModule } from 'carbon-components-angular';




@NgModule({
  declarations: [
    InfoCardComponent,
    InfoSectionComponent
  ],
  imports: [
    CommonModule,
    GridModule
  ],
  exports:  [InfoCardComponent, InfoSectionComponent]
})
export class InfoModule { }
