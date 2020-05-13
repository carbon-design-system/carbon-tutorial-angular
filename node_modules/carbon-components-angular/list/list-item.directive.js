/*!
 *
 * carbon-angular v0.0.0 | list-item.directive.js
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


import { Directive, HostBinding } from "@angular/core";
/**
 * Applies list styling to the item it is used on. Best used with `li`s.
 */
var ListItemDirective = /** @class */ (function () {
    function ListItemDirective() {
        this.wrapper = true;
    }
    ListItemDirective.decorators = [
        { type: Directive, args: [{
                    selector: "[ibmListItem]"
                },] },
    ];
    ListItemDirective.propDecorators = {
        wrapper: [{ type: HostBinding, args: ["class.bx--list__item",] }]
    };
    return ListItemDirective;
}());
export { ListItemDirective };
//# sourceMappingURL=list-item.directive.js.map