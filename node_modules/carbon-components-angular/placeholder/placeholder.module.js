/*!
 *
 * carbon-angular v0.0.0 | placeholder.module.js
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


// modules
import { NgModule, Optional, SkipSelf } from "@angular/core";
import { CommonModule } from "@angular/common";
// imports
import { Placeholder } from "./placeholder.component";
import { PlaceholderService } from "./placeholder.service";
// exports
export { Placeholder } from "./placeholder.component";
export { PlaceholderService } from "./placeholder.service";
// either provides a new instance of ModalPlaceholderService, or returns the parent
export function PLACEHOLDER_SERVICE_PROVIDER_FACTORY(parentService) {
    return parentService || new PlaceholderService();
}
// placholder service *must* be a singleton to ensure the placeholder viewref is accessible globally
export var PLACEHOLDER_SERVICE_PROVIDER = {
    provide: PlaceholderService,
    deps: [[new Optional(), new SkipSelf(), PlaceholderService]],
    useFactory: PLACEHOLDER_SERVICE_PROVIDER_FACTORY
};
var PlaceholderModule = /** @class */ (function () {
    function PlaceholderModule() {
    }
    PlaceholderModule.decorators = [
        { type: NgModule, args: [{
                    declarations: [Placeholder],
                    exports: [Placeholder],
                    providers: [PLACEHOLDER_SERVICE_PROVIDER],
                    imports: [CommonModule]
                },] },
    ];
    return PlaceholderModule;
}());
export { PlaceholderModule };
//# sourceMappingURL=placeholder.module.js.map