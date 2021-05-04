import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoCardComponent } from './info-card/info-card.component';
import { InfoSectionComponent } from './info-section/info-section.component';
import { GridModule, IconModule, IconService } from 'carbon-components-angular';

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
  exports:  [InfoCardComponent, InfoSectionComponent]
})
export class InfoModule {

}
