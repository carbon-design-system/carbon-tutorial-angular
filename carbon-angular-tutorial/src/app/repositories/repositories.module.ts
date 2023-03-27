import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RepositoriesRoutingModule } from './repositories-routing.module';
import { RepoPageComponent } from './repo-page/repo-page.component';
import {
    GridModule,
    TableModule,
    SearchModule,
    LinkModule,
    PaginationModule,
    PanelModule,
    ToggleModule,
    ButtonModule,
    DialogModule,
    NFormsModule
} from 'carbon-components-angular';

import {
    SettingsModule,
    DeleteModule,
    FilterModule,
    SaveModule,
    DownloadModule,
    AddModule
} from '@carbon/icons-angular';

import { RepoTableComponent } from './repo-table/repo-table.component';

@NgModule({
    declarations: [RepoPageComponent, RepoTableComponent],
    imports: [
        CommonModule,
        RepositoriesRoutingModule,
        GridModule,
        TableModule,
        LinkModule,
        PaginationModule,
        PanelModule,
        ToggleModule,
        ButtonModule,
        SettingsModule,
        DeleteModule,
        FilterModule,
        SaveModule,
        DownloadModule,
        AddModule,
        SearchModule,
        FormsModule,
        DialogModule,
        NFormsModule
    ]
})
export class RepositoriesModule { }
