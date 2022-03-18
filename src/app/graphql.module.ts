import { NgModule } from '@angular/core';
import {HttpLink} from 'apollo-angular/http';
import {ApolloModule, APOLLO_OPTIONS} from 'apollo-angular';
import { HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import {InMemoryCache} from '@apollo/client/core';
const uri = 'https://api.github.com/graphql'


@NgModule({
    imports: [ApolloModule],
    providers: [
        {
            provide: APOLLO_OPTIONS,
            useFactory: (httpLink: HttpLink) => {
                return {
                    cache: new InMemoryCache(),
                    link: httpLink.create({
                        uri,
                        headers: new HttpHeaders({ Authorization: `Bearer ${environment.githubPersonalAccessToken}` })
                    })
                }
            },
            deps: [HttpLink]
        }
    ],
    exports: [ApolloModule]
})
export class GraphqlModule {}