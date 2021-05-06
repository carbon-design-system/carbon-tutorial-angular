import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Table, TableModel, TableItem, TableHeaderItem } from 'carbon-components-angular';

@Component({
	selector: 'app-repo-table',
	templateUrl: './repo-table.component.html',
	styleUrls: ['./repo-table.component.scss']
})
export class RepoTableComponent implements OnInit {
	model = new TableModel();
	skeletonModel = Table.skeletonModel(10, 6);
	skeleton = true;
	data = [];

	@ViewChild('linkTemplate', null)
	protected linkTemplate: TemplateRef<any>;

	constructor(private apollo: Apollo) { }

	ngOnInit() {
		this.model.data = [
			[
				new TableItem({data: 'Repo 1', expandedData: 'Row description'}),
				new TableItem({data: 'Date'}),
				new TableItem({data: 'Date'}),
				new TableItem({data: '123'}),
				new TableItem({data: '456'}),
				new TableItem({data: 'Links'})
			],
			[
				new TableItem({data: 'Repo 2', expandedData: 'Row description'}),
				new TableItem({data: 'Date'}),
				new TableItem({data: 'Date'}),
				new TableItem({data: '123'}),
				new TableItem({data: '456'}),
				new TableItem({data: 'Links'})
			],
			[
				new TableItem({data: 'Repo 3', expandedData: 'Row description'}),
				new TableItem({data: 'Date'}),
				new TableItem({data: 'Date'}),
				new TableItem({data: '123'}),
				new TableItem({data: '456'}),
				new TableItem({data: 'Links'})
			]
		];
		this.model.header = [
			new TableHeaderItem({data: 'Name'}),
			new TableHeaderItem({data: 'Created'}),
			new TableHeaderItem({data: 'Updated'}),
			new TableHeaderItem({data: 'Open Issues'}),
			new TableHeaderItem({data: 'Stars'}),
			new TableHeaderItem({data: 'Links'})
		];

		this.apollo.watchQuery({
			query: gql`
			  query REPO_QUERY {
				# Let's use carbon as our organization
				organization(login: "carbon-design-system") {
				  # We'll grab all the repositories in one go. To load more resources
				  # continuously, see the advanced topics.
				  repositories(first: 75, orderBy: { field: UPDATED_AT, direction: DESC }) {
					totalCount
					nodes {
					  url
					  homepageUrl
					  issues(filterBy: { states: OPEN }) {
						totalCount
					  }
					  stargazers {
						totalCount
					  }
					  releases(first: 1) {
						totalCount
						nodes {
						  name
						}
					  }
					  name
					  updatedAt
					  createdAt
					  description
					  id
					}
				  }
				}
			  }
			`
		}).valueChanges.subscribe((response: any) => {
			if (response.error) {
				const errorData = [];
				errorData.push([
				new TableItem({data: 'error!' })
				]);
				this.model.data = errorData;
			} else if (response.loading) {
				this.skeleton = true;
			} else {
				this.data = response.data.organization.repositories.nodes;
				this.model.pageLength = 10;
				this.model.totalDataLength = response.data.organization.repositories.totalCount;
				this.selectPage(1);
			}
		});
	}

	prepareData(data) {
		const newData = [];
		this.skeleton = false;

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

	selectPage(page) {
		const offset = this.model.pageLength * (page - 1);
		const pageRawData = this.data.slice(offset, offset + this.model.pageLength);
		this.model.data = this.prepareData(pageRawData);
		this.model.currentPage = page;
	}
}
