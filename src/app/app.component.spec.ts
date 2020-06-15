import { TestBed, async } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";

import { AppComponent } from "./app.component";
import { HeaderComponent } from "./header/header.component";
import { HeaderModule } from "carbon-components-angular/ui-shell/ui-shell.module";

import { RepoTableComponent } from "./repositories/repo-table/repo-table.component";

import {
	TableModule,
	LinkModule,
	PaginationModule,
} from "carbon-components-angular";

describe("AppComponent", () => {
	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [AppComponent, HeaderComponent, RepoTableComponent],
			imports: [
				RouterTestingModule,
				HeaderModule,
				TableModule,
				LinkModule,
				PaginationModule,
			],
		}).compileComponents();
	}));

	it("should create the app", async(() => {
		const fixture = TestBed.createComponent(AppComponent);
		const app = fixture.debugElement.componentInstance;
		expect(app).toBeTruthy();
	}));
});
