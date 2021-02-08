import { NgModule } from '@angular/core';
import { APOLLO_OPTIONS } from 'apollo-angular';
import { ApolloClientOptions, InMemoryCache } from '@apollo/client/core';
// import { InMemoryCache } from '@apollo/client/core';
import { Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { environment } from '../environments/environment';
import { HttpHeaders } from '@angular/common/http';

const uri = 'https://api.github.com/graphql'; // <-- add the URL of the GraphQL server here
// export function createApollo(httpLink: HttpLink): ApolloClientOptions<any> {
export function createApollo(httpLink: HttpLink) {
	return {
		link: httpLink.create({uri,
			headers: new HttpHeaders({
				Authorization: `Bearer ${environment.githubPersonalAccessToken}`,
			}),
		}),
		cache: new InMemoryCache(),
	};
}
@NgModule({
	providers: [ Apollo, HttpLink,
		{
			provide: APOLLO_OPTIONS,
			useFactory: createApollo,
			deps: [HttpLink],
		},
	],
})
export class GraphQLModule {}