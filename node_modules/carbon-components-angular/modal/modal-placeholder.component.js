/*!
 *
 * carbon-angular v0.0.0 | modal-placeholder.component.js
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


import { Component, ViewContainerRef, ViewChild } from "@angular/core";
import { PlaceholderService } from "./../placeholder/placeholder.service";
/**
 * Deprecated with v2.0, will be removed in v3.0
 * Using a modal in your application requires *this* component (`n-modal-placeholder`).
 * It would generally be placed near the end of your app component template
 * (app.component.ts or app.component.html) as:
 *
 * ```html
 * ...
 * <ibm-modal-placeholder></ibm-modal-placeholder>
 * ```
 *
 * A more complete example for `Modal` is given as follows:
 *
 * ```html
 * <ibm-modal size="xl" (overlaySelected)="closeModal()">
 * 	<ibm-modal-header (closeSelect)="closeModal()">Header text</ibm-modal-header>
 * 	<section class="modal-body">
 * 		<h1>It Works!</h1>
 * 		{{modalText}}
 * 	</section>
 * 	<ibm-modal-footer><button class="btn cancel-button" (click)="closeModal()">Cancel</button></ibm-modal-footer>
 * </ibm-modal>
 * ...
 * <ibm-modal-placeholder></ibm-modal-placeholder>
 * ```
 *
 * @deprecated
 */
var ModalPlaceholder = /** @class */ (function () {
    /**
     * Creates an instance of `ModalPlaceholder`.
     */
    function ModalPlaceholder(placeholderService) {
        this.placeholderService = placeholderService;
    }
    /**
     * Initializes the component using `ModalService`.
     */
    ModalPlaceholder.prototype.ngOnInit = function () {
        console.warn("`ibm-modal-placeholder` has been deprecated in favour of `ibm-placeholder`");
        this.placeholderService.registerViewContainerRef(this.viewContainerRef);
    };
    ModalPlaceholder.decorators = [
        { type: Component, args: [{
                    selector: "ibm-modal-placeholder",
                    template: "<div #modalplaceholder></div>"
                },] },
    ];
    /** @nocollapse */
    ModalPlaceholder.ctorParameters = function () { return [
        { type: PlaceholderService }
    ]; };
    ModalPlaceholder.propDecorators = {
        viewContainerRef: [{ type: ViewChild, args: ["modalplaceholder", { read: ViewContainerRef },] }]
    };
    return ModalPlaceholder;
}());
export { ModalPlaceholder };
//# sourceMappingURL=modal-placeholder.component.js.map