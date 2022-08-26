import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';

import { GridModule, BreadcrumbModule, ButtonModule, TabsModule } from 'carbon-components-angular';

import { InfoModule } from '../info/info.module';


@NgModule({
  declarations: [
    LandingPageComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    GridModule,
    BreadcrumbModule,
    ButtonModule,
    TabsModule,
    InfoModule
  ]
})
export class HomeModule { }
