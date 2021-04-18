import { NgModule } from '@angular/core';
import { APOLLO_OPTIONS } from 'apollo-angular';
import { InMemoryCache } from '@apollo/client/core';
import { HttpLink } from 'apollo-angular/http';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Apollo } from 'apollo-angular';

const uri = 'https://api.github.com/graphql'; // <-- add the URL of the GraphQL server here
export function createApollo(httpLink: HttpLink) {
	return {
		link: httpLink.create({
			uri,
			headers: new HttpHeaders({
				Authorization: `Bearer ${environment.githubPersonalAccessToken}`,
			}),
		}),
		cache: new InMemoryCache(),
	};
}

@NgModule({
	providers: [
		Apollo,
		HttpLink,
		{
			provide: APOLLO_OPTIONS,
			useFactory: createApollo,
			deps: [HttpLink],
		},
	],
})
export class GraphQLModule {}
