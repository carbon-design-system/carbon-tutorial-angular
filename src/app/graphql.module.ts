import { HttpHeaders } from '@angular/common/http';
import { InMemoryCache } from '@apollo/client';
import { HttpLink } from 'apollo-link-http';
import { environment } from 'src/environments/environment';
import { createHttpLink } from 'apollo-link-http'; 

const uri = 'https://api.github.com/graphql'; // <-- add the URL of the GraphQL server here
const link = createHttpLink({ uri: "/graphql" });
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
