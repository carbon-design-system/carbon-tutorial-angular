/*!
 *
 * carbon-angular v0.0.0 | dropdown.service.d.ts
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


import { PlaceholderService } from "./../placeholder/placeholder.module";
import { Subscription } from "rxjs";
export declare class DropdownService {
    protected placeholderService: PlaceholderService;
    offset: {
        top?: number;
        left?: number;
    };
    /**
     * reference to the body appended menu
     */
    protected menuInstance: HTMLElement;
    /**
     * Maintains an Event Observable Subscription for tracking window resizes.
     * Window resizing is tracked if the `Dropdown` is appended to the body, otherwise it does not need to be supported.
     */
    protected resize: Subscription;
    protected _offset: {
        top: number;
        left: number;
    };
    constructor(placeholderService: PlaceholderService);
    /**
     * Appends the menu to the body, or a `ibm-placeholder` (if defined)
     *
     * @param parentRef container to position relative to
     * @param menuRef menu to be appended to body
     * @param classList any extra classes we should wrap the container with
     */
    appendToBody(parentRef: HTMLElement, menuRef: HTMLElement, classList: any): HTMLElement;
    /**
     * Reattach the dropdown menu to the parent container
     * @param hostRef container to append to
     */
    appendToDropdown(hostRef: HTMLElement): HTMLElement;
    /**
     * position an open dropdown relative to the given parentRef
     */
    updatePosition(parentRef: any): void;
    protected positionDropdown(parentRef: any, menuRef: any): void;
}
