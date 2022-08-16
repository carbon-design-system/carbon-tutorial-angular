import { HttpHeaders } from '@angular/common/http';
import { HttpLink } from "apollo-angular/http";
import { environment } from '../environments/environment';
import { InMemoryCache } from "@apollo/client/core";
import { APOLLO_OPTIONS, ApolloModule } from "apollo-angular";
import { NgModule } from "@angular/core";

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
	exports: [ApolloModule],
	providers: [
		{
			provide: APOLLO_OPTIONS,
			useFactory: createApollo,
			deps: [HttpLink],
		}
	],
})
export class GraphQLModule {}
