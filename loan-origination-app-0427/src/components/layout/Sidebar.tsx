import { useState } from 'react';
import { NavLink } from 'react-router-dom';

type BadgeTone = 'p' | 'a' | 'b' | 'r';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: { text: string; tone: BadgeTone };
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Home',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: '■' }],
  },
  {
    title: 'My Cases',
    items: [
      { to: '/cases', label: 'All Cases', icon: '☐', badge: { text: '47', tone: 'b' } },
      { to: '/queue', label: 'Needs My Input', icon: '⚠', badge: { text: '13', tone: 'a' } },
      { to: '/sla-risk', label: 'SLA Risk', icon: '⌚', badge: { text: '6', tone: 'r' } },
      { to: '/agent-handled', label: 'Agent Handled', icon: '★', badge: { text: '34', tone: 'p' } },
    ],
  },
  {
    title: 'My Tasks',
    items: [{ to: '/my-tasks', label: 'Open Tasks', icon: '☑', badge: { text: '8', tone: 'a' } }],
  },
  {
    title: 'Insights',
    items: [{ to: '/analytics', label: 'Analytics', icon: '▦' }],
  },
  {
    title: 'Resources',
    items: [
      { to: '/kb', label: 'Knowledge Base', icon: '📚' },
      { to: '/tools', label: 'Tools', icon: '🔧' },
    ],
  },
];

const BADGE_STYLES: Record<BadgeTone, { bg: string; fg: string }> = {
  p: { bg: 'rgba(20,184,166,0.3)', fg: '#5EEAD4' },
  a: { bg: 'rgba(217,119,6,0.3)', fg: '#FCD34D' },
  b: { bg: 'rgba(37,99,235,0.3)', fg: '#93C5FD' },
  r: { bg: 'rgba(220,38,38,0.3)', fg: '#FCA5A5' },
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-200"
      style={{
        width: collapsed ? 56 : 240,
        background: '#0F1724',
        borderRight: '1px solid #1A2536',
      }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2.5 px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="sb-logo w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-[9px]"
          style={{ background: 'linear-gradient(135deg,#0E2A47,#1E4480)' }}
        />
        {!collapsed && (
          <div>
            <div className="text-[13px] font-semibold text-white">Accrual Bank</div>
            <div className="text-[10px] text-white/35 mt-px">It all adds up</div>
          </div>
        )}
      </button>

      <nav className="flex-1 overflow-y-auto py-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <div className="text-[9px] font-semibold uppercase tracking-[1px] text-white/20 px-4 pt-4 pb-1.5">
                {section.title}
              </div>
            )}
            {collapsed && <div className="h-3" />}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-colors mx-2 my-[1px] ${
                  collapsed ? 'justify-center py-2.5' : 'px-4 py-2'
                }`}
                style={({ isActive }) => ({
                  background: isActive ? '#243044' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                })}
              >
                <span className="w-4 text-center text-[13px] flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="whitespace-nowrap">{item.label}</span>
                    {item.badge && (
                      <span
                        className="ml-auto text-[10px] font-semibold px-1.5 py-px rounded-[10px]"
                        style={{
                          background: BADGE_STYLES[item.badge.tone].bg,
                          color: BADGE_STYLES[item.badge.tone].fg,
                        }}
                      >
                        {item.badge.text}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1E4480,#0F9D8F)' }}
        >
          DP
        </div>
        {!collapsed && (
          <div>
            <div className="text-xs font-medium text-white">Dhruv Patel</div>
            <div className="text-[10px] text-white/35">Loan Officer</div>
          </div>
        )}
      </div>
    </aside>
  );
}
