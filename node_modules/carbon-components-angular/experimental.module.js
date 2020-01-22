/*!
 *
 * carbon-angular v0.0.0 | experimental.module.js
 *
 * Copyright 2014, 2019 IBM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import { NgModule, SkipSelf, Optional } from "@angular/core";
import { ExperimentalService } from "./experimental.service";
// either provides a new instance of ExperimentalService, or returns the parent
export function EXPERIMENTAL_SERVICE_PROVIDER_FACTORY(parentService) {
    return parentService || new ExperimentalService();
}
export var EXPERIMENTAL_SERVICE_PROVIDER = {
    provide: ExperimentalService,
    deps: [[new Optional(), new SkipSelf(), ExperimentalService]],
    useFactory: EXPERIMENTAL_SERVICE_PROVIDER_FACTORY
};
var ExperimentalModule = /** @class */ (function () {
    function ExperimentalModule() {
    }
    ExperimentalModule.decorators = [
        { type: NgModule, args: [{
                    providers: [
                        ExperimentalService,
                        EXPERIMENTAL_SERVICE_PROVIDER
                    ]
                },] },
    ];
    return ExperimentalModule;
}());
export { ExperimentalService, ExperimentalModule };
//# sourceMappingURL=experimental.module.js.map