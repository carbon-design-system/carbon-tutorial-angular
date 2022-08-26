import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-info-card',
  templateUrl: './info-card.component.html',
  styleUrls: ['./info-card.component.scss']
})
export class InfoCardComponent implements OnInit {

  @Input() heading: any;
  @Input() content: any;
  splitHeading: any;

  constructor() { }

  ngOnInit(): void {

    this.splitHeading = this.createArrayFromPhrase(this.heading);
  }

  createArrayFromPhrase(phrase: string) {
    const splitPhrase = phrase.split(" ");
    const thirdWord = splitPhrase.pop();
    return [splitPhrase.join(" "), thirdWord];
  }
}
