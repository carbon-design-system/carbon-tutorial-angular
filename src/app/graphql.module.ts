import {NgModule} from '@angular/core';
import { APOLLO_OPTIONS} from 'apollo-angular';
import {HttpClientModule} from '@angular/common/http';
import {ApolloClientOptions, InMemoryCache} from '@apollo/client/core';
import { HttpLink} from 'apollo-angular/http';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';
import { BrowserModule } from '@angular/platform-browser';


const uri = 'https://api.github.com/graphql'; // <-- add the URL of the GraphQL server here

export function createApollo(httpLink: HttpLink): ApolloClientOptions<any> {
  // return {
  //  link: httpLink.create({uri}),
  //  cache: new InMemoryCache(),
  // };

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
/*
export function createApollo(httpLink: HttpLink) {
  return {
    link: httpLink.create({uri: 'https://api.example.com/graphql'}),
    cache: new InMemoryCache(),
  };
}
*/

@NgModule({
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {}
