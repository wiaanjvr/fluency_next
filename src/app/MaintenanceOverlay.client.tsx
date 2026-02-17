"use client";
import React from "react";

export default function MaintenanceOverlay() {
  return (
    <div
      role="presentation"
      aria-hidden={false}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(255,255,255,0)",
        cursor: "not-allowed",
      }}
    />
  );
}
