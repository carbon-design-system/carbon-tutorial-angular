/*!
 *
 * carbon-angular v0.0.0 | forms.module.js
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
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
// imports
import { CheckboxModule } from "../checkbox/checkbox.module";
import { ToggleModule } from "../toggle/toggle.module";
import { RadioModule } from "../radio/radio.module";
import { InputModule } from "../input/input.module";
import { ButtonModule } from "../button/button.module";
// exports
export { CheckboxModule } from "../checkbox/checkbox.module";
export { ToggleModule } from "../toggle/toggle.module";
export { RadioModule } from "../radio/radio.module";
export { InputModule } from "../input/input.module";
export { ButtonModule } from "../button/button.module";
var NFormsModule = /** @class */ (function () {
    function NFormsModule() {
    }
    NFormsModule.decorators = [
        { type: NgModule, args: [{
                    exports: [
                        CheckboxModule,
                        ToggleModule,
                        RadioModule,
                        InputModule,
                        ButtonModule
                    ],
                    imports: [
                        CommonModule,
                        FormsModule,
                        CheckboxModule,
                        ToggleModule,
                        RadioModule,
                        InputModule,
                        ButtonModule
                    ]
                },] },
    ];
    return NFormsModule;
}());
export { NFormsModule };
//# sourceMappingURL=forms.module.js.map