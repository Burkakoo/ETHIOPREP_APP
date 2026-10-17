import React from "react";
import { apiRequest } from "../services/api.js";
import { statusBadge } from "../components/Badge.jsx";
import { getGreeting } from "../utils/helpers.js";

export function Overview({ user, stats }) {
  const items = [
    { label: "Subjects", value: stats.subjects, icon: "📚", cls: "icon-green" },
    { label: "Questions", value: stats.questions, icon: "❓", cls: "icon-blue" },
    { label: "Exams Published", value: stats.exams, icon: "📝", cls: "icon-purple" },
    { label: "Pending Payments", value: stats.pendingPayments, icon: "💳", cls: "icon-amber" },
  ];

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Dashboard</span></div>
        <h1>Good {getGreeting()}, {user.displayName.split(" ")[0]} 👋</h1>
        <p className="page-desc">Here's what's happening on EthioPrep right now.</p>
      </div>
      <div className="content-body">
        <div className="stats-grid">
          {items.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-header">
                <span className="stat-label">{s.label}</span>
                <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              </div>
              <div className="stat-value">{s.value ?? "—"}</div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Your Role & Permissions</span>
          </div>
          <div className="panel-body">
            <table>
              <thead><tr><th>Capability</th><th>Access</th></tr></thead>
              <tbody>
                {[
                  ["Manage Subjects & Chapters", ["admin", "content_manager"]],
                  ["Create & Publish Exams", ["admin", "content_manager"]],
                  ["Manage Question Bank", ["admin", "content_manager"]],
                  ["Verify Payments", ["admin", "cash_manager"]],
                  ["View Analytics", ["admin", "cash_manager", "content_manager"]],
                  ["Manage All Users", ["admin"]],
                ].map(([cap, roles]) => (
                  <tr key={cap}>
                    <td>{cap}</td>
                    <td>{roles.includes(user.role)
                      ? <span className="badge badge-green">✓ Allowed</span>
                      : <span className="badge badge-gray">✕ No Access</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
