import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { routes } from './home-routing.module';
@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule]
})
export class HomeRoutingModule {
}
