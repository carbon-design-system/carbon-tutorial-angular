import { HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';
import { HttpLink } from 'apollo-angular-link-http';
import { InMemoryCache } from '@apollo/client';

const uri = 'https://api.github.com/graphql/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'; // <-- add the URL of the GraphQL server here
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