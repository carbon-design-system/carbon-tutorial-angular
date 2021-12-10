import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-repo-page',
  templateUrl: './repo-page.component.html',
  styleUrls: ['./repo-page.component.scss']
})
export class RepoPageComponent implements OnInit {

  constructor() {
    console.log("RepoPageComponent constructor...")
  }

  ngOnInit(): void {
    console.log("RepoPageComponent ngOnInit...")
  }

}
