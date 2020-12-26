import { NgModule } from '@angular/core';
import { APOLLO_OPTIONS } from 'apollo-angular';
import { ApolloClientOptions } from '../../node_modules/apollo-client'; // from '@apollo/client/core';
import { InMemoryCache } from '../../node_modules/apollo-cache-inmemory';
import { HttpLink } from '../../node_modules/apollo-angular-link-http';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';

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
		{
			provide: APOLLO_OPTIONS,
			useFactory: createApollo,
			deps: [HttpLink],
		},
	],
})
export class GraphQLModule {}
