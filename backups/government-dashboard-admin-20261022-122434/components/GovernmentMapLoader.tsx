"use client";

import dynamic from "next/dynamic";
import { createElement } from "react";

const GovernmentMap = dynamic(
  
  () => import("./GovernmentMap").then((module) => module.default),
  {
    ssr: false,
    loading: () =>
      createElement(
        "div",
        { className: "flex h-[500px] items-center justify-center rounded-xl bg-gray-100" },
        "Loading GIS map..."
      ),
  }
);

export default function GovernmentMapLoader() {
  return createElement(GovernmentMap);
}