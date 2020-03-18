/*!
 *
 * carbon-angular v0.0.0 | overflow-menu.directive.js
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


var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { Directive, ElementRef, ViewContainerRef, Input, TemplateRef, HostListener } from "@angular/core";
import { DialogDirective } from "./../dialog.directive";
import { DialogService } from "./../dialog.service";
import { OverflowMenuPane } from "./overflow-menu-pane.component";
/**
 * Directive for extending `Dialog` to create overflow menus.
 *
 * class: OverflowMenuDirective (extends DialogDirective)
 *
 *
 * selector: `ibmOverflowMenu`
 *
 *
 * ```html
 * <div [ibmOverflowMenu]="templateRef"></div>
 * <ng-template #templateRef>
 * 	<!-- overflow menu options here -->
 * </ng-template>
 * ```
 */
var OverflowMenuDirective = /** @class */ (function (_super) {
    __extends(OverflowMenuDirective, _super);
    /**
     * Creates an instance of `OverflowMenuDirective`.
     */
    function OverflowMenuDirective(elementRef, viewContainerRef, dialogService) {
        var _this = _super.call(this, elementRef, viewContainerRef, dialogService) || this;
        _this.elementRef = elementRef;
        _this.viewContainerRef = viewContainerRef;
        _this.dialogService = dialogService;
        /**
         * Controls wether the overflow menu is flipped
         */
        _this.flip = false;
        dialogService.create(OverflowMenuPane);
        return _this;
    }
    OverflowMenuDirective.prototype.onDialogInit = function () {
        this.dialogConfig.content = this.ibmOverflowMenu;
        this.dialogConfig.flip = this.flip;
    };
    OverflowMenuDirective.prototype.hostkeys = function (event) {
        switch (event.key) {
            case "Enter":
            case " ":
                event.preventDefault();
                this.toggle();
                break;
        }
    };
    OverflowMenuDirective.decorators = [
        { type: Directive, args: [{
                    selector: "[ibmOverflowMenu]",
                    exportAs: "ibmOverflowMenu",
                    providers: [
                        DialogService
                    ]
                },] },
    ];
    /** @nocollapse */
    OverflowMenuDirective.ctorParameters = function () { return [
        { type: ElementRef },
        { type: ViewContainerRef },
        { type: DialogService }
    ]; };
    OverflowMenuDirective.propDecorators = {
        ibmOverflowMenu: [{ type: Input }],
        flip: [{ type: Input }],
        hostkeys: [{ type: HostListener, args: ["keydown", ["$event"],] }]
    };
    return OverflowMenuDirective;
}(DialogDirective));
export { OverflowMenuDirective };
//# sourceMappingURL=overflow-menu.directive.js.map