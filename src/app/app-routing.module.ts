import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RepoPageComponent } from './repositories/repo-page/repo-page.component';

const routes: Routes = [
	{
		path: '',
		loadChildren: () => import('./home/home.module').then(m => m.HomeModule),
	},
	{
		path: 'repos',
		loadChildren: () =>
		import('./repositories/repositories.module').then(
			m => m.RepositoriesModule
		),
	},
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule { }
