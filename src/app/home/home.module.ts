import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';
import {
  BreadcrumbModule,
  GridModule,
  ButtonModule,
  TabsModule,
} from 'carbon-components-angular';

@NgModule({
  declarations: [LandingPageComponent],
  imports: [
    TabsModule,
    ButtonModule,
    BreadcrumbModule,
    GridModule,
    CommonModule,
    HomeRoutingModule,
  ],
})
export class HomeModule {}
