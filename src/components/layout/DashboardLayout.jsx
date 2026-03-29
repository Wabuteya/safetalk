import React, { useState, useCallback } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import './DashboardLayout.css';

/**
 * DashboardLayout — Responsive layout with sidebar.
 * Desktop (≥768px): Sidebar always visible, pinned left.
 * Mobile (<768px): Sidebar hidden by default; hamburger opens sliding overlay; backdrop/nav closes it.
 */
const DashboardLayout = ({ sidebar, children, title = 'Dashboard', mobileLogoSrc }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);

  const sidebarWithClose = React.isValidElement(sidebar)
    ? React.cloneElement(sidebar, { closeSidebar })
    : sidebar;

  return (
    <div className="dashboard-layout-root portal-layout">
      {/* Mobile topbar: hamburger + title (hidden on desktop) */}
      <header className="dashboard-layout-mobile-topbar" aria-label="Mobile navigation">
        <button
          type="button"
          className="dashboard-layout-hamburger"
          onClick={toggleSidebar}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          {sidebarOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
        </button>
        {mobileLogoSrc ? (
          <h1 className="dashboard-layout-mobile-title dashboard-layout-mobile-title--logo">
            <img src={mobileLogoSrc} alt={title} className="dashboard-layout-mobile-logo" />
          </h1>
        ) : (
          <h1 className="dashboard-layout-mobile-title">{title}</h1>
        )}
      </header>

      {/* Backdrop: closes sidebar on tap (mobile only) */}
      <div
        className={`dashboard-layout-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
        onKeyDown={(e) => e.key === 'Escape' && closeSidebar()}
        role="button"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Sidebar: drawer on mobile, inline on desktop */}
      <aside className={`dashboard-layout-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {sidebarWithClose}
      </aside>

      {/* Main content */}
      <main className="dashboard-layout-main">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
