import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {LandingPageComponent} from './home/landing-page/landing-page.component';
import { RepoPageComponent } from './repositories/repo-page/repo-page.component';

const routes: Routes = [
  {
    path:'',
    loadChildren: () => import('./home/home.module').then((m) => m.HomeModule),
    // component: LandingPageComponent
  },
  {
    path:'repos',
    loadChildren:() => import('./repositories/repositories.module').then(m=>{
      m.RepositoriesModule
    })
    // component: RepoPageComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
