import { NgModule } from '@angular/core';
import { GridModule } from 'carbon-components-angular';
import { BreadcrumbModule, ButtonModule, TabsModule } from 'carbon-components-angular';

import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
    //	CommonModule,
		HomeRoutingModule,
        GridModule,
        BreadcrumbModule,
        ButtonModule,
        TabsModule
	]
})
export class HomeModule { }
