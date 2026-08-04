"use client";

import { ReactNode, useState } from "react";

type WorkspaceTab = "build" | "search";

interface ArrangeWorkspaceTabsProps {
  buildPanel: ReactNode;
  searchPanel: ReactNode;
}

export function ArrangeWorkspaceTabs({ buildPanel, searchPanel }: ArrangeWorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("build");

  return (
    <div className="workspace-switcher">
      <div className="workspace-tabs" role="tablist" aria-label="アレンジの検討方法">
        <button
          type="button"
          id="workspace-tab-build"
          role="tab"
          aria-selected={activeTab === "build"}
          aria-controls="workspace-panel-build"
          onClick={() => setActiveTab("build")}
        >
          <span>考える</span>
        </button>
        <button
          type="button"
          id="workspace-tab-search"
          role="tab"
          aria-selected={activeTab === "search"}
          aria-controls="workspace-panel-search"
          onClick={() => setActiveTab("search")}
        >
          <span>さがす</span>
        </button>
      </div>

      <div
        id="workspace-panel-build"
        role="tabpanel"
        aria-labelledby="workspace-tab-build"
        hidden={activeTab !== "build"}
      >
        {buildPanel}
      </div>
      <div
        id="workspace-panel-search"
        role="tabpanel"
        aria-labelledby="workspace-tab-search"
        hidden={activeTab !== "search"}
      >
        {searchPanel}
      </div>
    </div>
  );
}
