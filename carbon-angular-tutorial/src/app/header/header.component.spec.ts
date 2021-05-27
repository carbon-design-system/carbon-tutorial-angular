import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HeaderComponent } from "./header.component";
import { UIShellModule } from "carbon-components-angular/ui-shell/ui-shell.module";


describe("HeaderComponent", () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;

    TestBed.configureTestingModule({
        declarations: [HeaderComponent],
        imports: [UIShellModule],
    });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [HeaderComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
