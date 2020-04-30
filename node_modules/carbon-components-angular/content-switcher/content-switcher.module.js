/*!
 *
 * carbon-angular v0.0.0 | content-switcher.module.js
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


import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ContentSwitcher } from "./content-switcher.component";
import { ContentSwitcherOption } from "./content-switcher-option.directive";
export { ContentSwitcher } from "./content-switcher.component";
export { ContentSwitcherOption } from "./content-switcher-option.directive";
var ContentSwitcherModule = /** @class */ (function () {
    function ContentSwitcherModule() {
    }
    ContentSwitcherModule.decorators = [
        { type: NgModule, args: [{
                    declarations: [
                        ContentSwitcher,
                        ContentSwitcherOption
                    ],
                    exports: [
                        ContentSwitcher,
                        ContentSwitcherOption
                    ],
                    imports: [CommonModule]
                },] },
    ];
    return ContentSwitcherModule;
}());
export { ContentSwitcherModule };
//# sourceMappingURL=content-switcher.module.js.map