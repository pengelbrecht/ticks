import {
  carousel_item_styles_default
} from "./chunk.NQ44LUGM.js";
import {
  component_styles_default
} from "./chunk.TUVJKY7S.js";
import {
  ShoelaceElement
} from "./chunk.4TUIT776.js";

// src/components/carousel-item/carousel-item.component.ts
import { html } from "lit";
var SlCarouselItem = class extends ShoelaceElement {
  connectedCallback() {
    super.connectedCallback();
  }
  render() {
    return html` <slot></slot> `;
  }
};
SlCarouselItem.styles = [component_styles_default, carousel_item_styles_default];

export {
  SlCarouselItem
};
