import React from "react";

export function Notice({ text, type = "info", onClose }) {
  if (!text) return null;
  return (
    <div className={`notice notice-${type}`}>
      <span>{type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span>
      {text}
      {onClose && <button onClick={onClose} className="modal-close" style={{ marginLeft: "auto", fontSize: 14 }}>×</button>}
    </div>
  );
}
