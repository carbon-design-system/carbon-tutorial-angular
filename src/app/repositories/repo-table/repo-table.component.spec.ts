import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import {
	LinkModule,
	PaginationModule,
	TableModule,
} from "carbon-components-angular";
import { RepoTableComponent } from "./repo-table.component";
import { GraphQLModule } from '../../graphql.module';
describe("RepoTableComponent", () => {
	let component: RepoTableComponent;
	let fixture: ComponentFixture<RepoTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [RepoTableComponent],
			imports: [TableModule, LinkModule, PaginationModule, GraphQLModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(RepoTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
