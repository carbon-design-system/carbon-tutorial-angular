import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-repo-page',
  templateUrl: './repo-page.component.html',
  styleUrls: ['./repo-page.component.scss']
})
export class RepoPageComponent implements OnInit {

  constructor() {
    console.log('foo');
  }

  ngOnInit(): void {
    console.log('foo');
  }

}
