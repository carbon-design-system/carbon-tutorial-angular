import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderComponent } from './header.component';
import { UIShellModule } from 'carbon-components-angular';
// import { UIShellModule } from 'carbon-components-angular/ui-shell/ui-shell.module';

// describe('HeaderComponent', () => {
//   let component: HeaderComponent;
//   let fixture: ComponentFixture<HeaderComponent>;

//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       declarations: [ HeaderComponent ]
//     })
//     .compileComponents();

//     fixture = TestBed.createComponent(HeaderComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });

TestBed.configureTestingModule({
  declarations: [HeaderComponent],
  imports: [UIShellModule]
});


// import { async, ComponentFixture, TestBed } from '@angular/core/testing';

// import { HeaderComponent } from './header.component';
// import { UIShellModule } from 'carbon-components-angular';

// describe('HeaderComponent', () => {
// 	let component: HeaderComponent;
// 	let fixture: ComponentFixture<HeaderComponent>;

// 	beforeEach(async(() => {
// 		TestBed.configureTestingModule({
// 			declarations: [ HeaderComponent ],
// 			imports: [ UIShellModule ],
// 		})
// 		.compileComponents();
// 	}));

// 	beforeEach(() => {
// 		fixture = TestBed.createComponent(HeaderComponent);
// 		component = fixture.componentInstance;
// 		fixture.detectChanges();
// 	});

// 	it('should create', () => {
// 		expect(component).toBeTruthy();
// 	});
// });