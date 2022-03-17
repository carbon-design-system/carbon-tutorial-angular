import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { GridModule, BreadcrumbModule, TabsModule, ButtonModule } from 'carbon-components-angular';
import { HomeRoutingModule } from './home-routing.module';



@NgModule({
  declarations: [
    LandingPageComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    GridModule,
    BreadcrumbModule,
    TabsModule,
    ButtonModule
  ]
})
export class HomeModule { }
