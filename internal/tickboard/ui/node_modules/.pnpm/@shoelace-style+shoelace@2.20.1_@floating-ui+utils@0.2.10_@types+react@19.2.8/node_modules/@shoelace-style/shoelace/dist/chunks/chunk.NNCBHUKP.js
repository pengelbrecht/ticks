import {
  SlInclude
} from "./chunk.5H57EOKC.js";

// src/react/include/index.ts
import * as React from "react";
import { createComponent } from "@lit/react";
import "@lit/react";
var tagName = "sl-include";
SlInclude.define("sl-include");
var reactWrapper = createComponent({
  tagName,
  elementClass: SlInclude,
  react: React,
  events: {
    onSlLoad: "sl-load",
    onSlError: "sl-error"
  },
  displayName: "SlInclude"
});
var include_default = reactWrapper;

export {
  include_default
};
