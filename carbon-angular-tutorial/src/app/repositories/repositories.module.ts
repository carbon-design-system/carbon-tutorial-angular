import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RepoPageComponent } from './repo-page/repo-page.component';
import { RepositoriesRoutingModule } from './repositories-routing.module'


@NgModule({
  declarations: [
    RepoPageComponent
  ],
  imports: [
    CommonModule,
    RepositoriesRoutingModule
  ]
})
export class RepositoriesModule { }
