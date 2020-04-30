/*!
 *
 * carbon-angular v0.0.0 | table-toolbar-content.component.js
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


import { Component, HostBinding } from "@angular/core";
var TableToolbarContent = /** @class */ (function () {
    function TableToolbarContent() {
        this.class = true;
    }
    TableToolbarContent.decorators = [
        { type: Component, args: [{
                    selector: "ibm-table-toolbar-content",
                    template: "<ng-content></ng-content>"
                },] },
    ];
    TableToolbarContent.propDecorators = {
        class: [{ type: HostBinding, args: ["class.bx--toolbar-content",] }]
    };
    return TableToolbarContent;
}());
export { TableToolbarContent };
//# sourceMappingURL=table-toolbar-content.component.js.map