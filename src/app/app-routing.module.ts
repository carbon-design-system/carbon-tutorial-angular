import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { DocsComponent } from './pages/docs/docs.component';
import { SupportComponent } from './pages/support/support.component';
import { Link1Component } from './pages/link1/link1.component';
import { RepoPageComponent } from './repositories/repo-page/repo-page.component';
import { LandingPageComponent } from './home/landing-page/landing-page.component';

const routes: Routes = [
	{
		path: '',
		loadChildren: () => import('./home/home.module').then((m) => m.HomeModule),
	},
	{
		path: 'repos',
		loadChildren: () =>
		import('./repositories/repositories.module').then(
			(m) => m.RepositoriesModule
		),
	},
	{
		path: '',
		component: LandingPageComponent,
	},
	{
		path: '',
		component: RepoPageComponent,
	},
];

@NgModule({
	imports: [RouterModule.forRoot(routes, { useHash: true })],
	exports: [RouterModule]
})
export class AppRoutingModule { }
