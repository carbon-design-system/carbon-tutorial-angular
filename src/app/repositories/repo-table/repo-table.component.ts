
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';

import {
  TableModel,
  TableItem,
  TableHeaderItem,
  Table,
} from 'carbon-components-angular';
import {query} from './repo-table.query'
@Component({
  selector: 'app-repo-table',
  templateUrl: './repo-table.component.html',
  styleUrls: ['./repo-table.component.scss']
})
export class RepoTableComponent implements OnInit {

  @ViewChild('linkTemplate') protected linkTemplate?: TemplateRef<any>;

  data = []

  model = new TableModel();
  skeleton = true
  skeletonModel = Table.skeletonModel(10, 6)

  constructor(private apollo: Apollo) { }

  ngOnInit(): void {

    this.apollo.watchQuery({
      query: gql`${query}`
    }).valueChanges.subscribe({ next: (response) => {

      if(response.loading){
        this.skeleton = true
      } else {

        this.data = (response.data as any).organization.repositories.nodes;
        this.model.pageLength = 10;
        this.model.totalDataLength = (response.data as any).organization.repositories.nodes.length;
        this.selectPage(1);

        this.skeleton = false
      }

    }, error: (err) => { console.error(err) }})



    
    this.model.header = [
      new TableHeaderItem({ data: 'Name' }),
      new TableHeaderItem({ data: 'Created' }),
      new TableHeaderItem({ data: 'Updated' }),
      new TableHeaderItem({ data: 'Open Issues' }),
      new TableHeaderItem({ data: 'Stars' }),
      new TableHeaderItem({ data: 'Links' }),
    ];
  }

  prepareData(data: any) {
    const newData = [];
  
    for (const datum of data) {
      newData.push([
        new TableItem({ data: datum.name, expandedData: datum.description }),
        new TableItem({ data: new Date(datum.createdAt).toLocaleDateString() }),
        new TableItem({ data: new Date(datum.updatedAt).toLocaleDateString() }),
        new TableItem({ data: datum.issues.totalCount }),
        new TableItem({ data: datum.stargazers.totalCount }),
        new TableItem({
          data: {
            github: datum.url,
            homepage: datum.homepageUrl
          },
          template: this.linkTemplate
        })
      ]);
    }
    return newData;
  }

  selectPage(page: number){
    const offset = this.model.pageLength * (page - 1);
    const pageRawData = this.data.slice(offset, offset + this.model.pageLength);
    this.model.data = this.prepareData(pageRawData);
    this.model.currentPage = page;
  }

}
