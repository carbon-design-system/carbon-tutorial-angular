import { Component, OnInit } from '@angular/core';

import {
  TableModel,
  TableItem,
  TableHeaderItem,
} from 'carbon-components-angular';


@Component({
  selector: 'app-repo-table',
  templateUrl: './repo-table.component.html',
  styleUrls: ['./repo-table.component.scss']
})
export class RepoTableComponent implements OnInit {
  // TODO: Change to correct model
  model = 0;
  constructor() { }

  ngOnInit(): void {
  }

}
