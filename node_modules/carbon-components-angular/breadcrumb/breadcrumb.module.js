/*!
 *
 * carbon-angular v0.0.0 | breadcrumb.module.js
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
import { DialogModule } from "../dialog/dialog.module";
import { Breadcrumb } from "./breadcrumb.component";
import { BreadcrumbItemComponent } from "./breadcrumb-item.component";
export { Breadcrumb } from "./breadcrumb.component";
export { BreadcrumbItemComponent } from "./breadcrumb-item.component";
var BreadcrumbModule = /** @class */ (function () {
    function BreadcrumbModule() {
    }
    BreadcrumbModule.decorators = [
        { type: NgModule, args: [{
                    declarations: [
                        Breadcrumb,
                        BreadcrumbItemComponent
                    ],
                    exports: [
                        Breadcrumb,
                        BreadcrumbItemComponent
                    ],
                    imports: [
                        CommonModule,
                        DialogModule
                    ]
                },] },
    ];
    return BreadcrumbModule;
}());
export { BreadcrumbModule };
//# sourceMappingURL=breadcrumb.module.js.map