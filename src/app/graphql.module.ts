import { HttpHeaders } from '@angular/common/http';

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
