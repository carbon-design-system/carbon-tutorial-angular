import { NgModule } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { environment } from '../environments/environment';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloModule, APOLLO_OPTIONS } from 'apollo-angular';


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
	exports: [ApolloModule, HttpLinkModule],
	providers: [
		{
			provide: APOLLO_OPTIONS,
			useFactory: createApollo,
			deps: [HttpLink]
		}
	]
})
export class GraphQLModule {}
