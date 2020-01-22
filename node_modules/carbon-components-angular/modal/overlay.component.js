/*!
 *
 * carbon-angular v0.0.0 | overlay.component.js
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


import { Component, Output, EventEmitter, ViewChild, ElementRef, Input } from "@angular/core";
/**
 * Component for the overlay object that acts as a backdrop to the `Modal` component.
 *
 * The main purpose for this component is to be able to handle click events that fall outside
 * the bounds of the `Modal` component.
 */
var Overlay = /** @class */ (function () {
    function Overlay() {
        /**
         * Classification of the modal.
         */
        this.theme = "default";
        /**
         * To emit the event where the user selects the overlay behind the `Modal`.
         */
        this.overlaySelect = new EventEmitter();
    }
    /**
     * Handles the user clicking on the `Overlay` which resides outside the `Modal` object.
     */
    Overlay.prototype.overlayClick = function (event) {
        if (event.target !== this.overlay.nativeElement) {
            return;
        }
        event.stopPropagation();
        this.overlaySelect.emit(event);
    };
    Overlay.decorators = [
        { type: Component, args: [{
                    selector: "ibm-overlay",
                    template: "\n\t\t<section\n\t\t\tclass=\"bx--modal bx--modal-tall is-visible\"\n\t\t\t[ngClass]=\"{'bx--modal--danger': theme === 'danger'}\"\n\t\t\t(click)=\"overlayClick($event)\"\n\t\t\t#overlay>\n\t\t\t<ng-content></ng-content>\n\t\t</section>\n\t"
                },] },
    ];
    Overlay.propDecorators = {
        theme: [{ type: Input }],
        overlaySelect: [{ type: Output }],
        overlay: [{ type: ViewChild, args: ["overlay",] }]
    };
    return Overlay;
}());
export { Overlay };
//# sourceMappingURL=overlay.component.js.map