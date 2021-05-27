import { TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { AppComponent } from "./app.component";

import { UIShellModule } from "carbon-components-angular/ui-shell/ui-shell.module";
import { HeaderComponent } from "./header/header.component";

describe("AppComponent", () => {
    TestBed.configureTestingModule({
        declarations: [HeaderComponent],
        imports: [UIShellModule],
    });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            declarations: [AppComponent, HeaderComponent],
        }).compileComponents();
    });

    it("should create the app", () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });
});
