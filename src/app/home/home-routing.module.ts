import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
<<<<<<< HEAD


const routes: Routes = [];
=======
import { LandingPageComponent } from './landing-page/landing-page.component';


const routes: Routes = [
	{
		path: '',
		component: LandingPageComponent,
	}
];
>>>>>>> 0e0c6ef63175c81fab6dc8e9fbd5ef27ae43335f

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule]
})
export class HomeRoutingModule { }
