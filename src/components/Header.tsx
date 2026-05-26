import { NavLink } from "react-router-dom";
import { Zap, FileText, ListTodo, MessageSquare, Bot, Store, Plug, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tabs: { label: string; path: string; Icon: LucideIcon }[] = [
  { label: "Capabilities", path: "/capabilities", Icon: Zap },
  { label: "Notes", path: "/notes", Icon: FileText },
  { label: "Tasks", path: "/tasks", Icon: ListTodo },
  { label: "Sessions", path: "/sessions", Icon: MessageSquare },
  { label: "Automations", path: "/automations", Icon: Bot },
  { label: "Scripts", path: "/scripts", Icon: ScrollText },
  { label: "Integrations", path: "/integrations", Icon: Plug },
  { label: "Marketplace", path: "/marketplace", Icon: Store },
];

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="px-6">
        <div className="flex items-center gap-8 h-14">
          <div className="flex items-center gap-2">
            <img src="/wingman.png" alt="Wingman" className="h-10 w-10" />
            <span className="text-sm font-semibold text-gray-900 tracking-tight">Wingman</span>
          </div>
          <nav className="flex items-center gap-1 h-full">
            {tabs.map(({ label, path, Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  [
                    "relative flex items-center gap-1.5 h-full px-3 text-sm transition-colors",
                    isActive
                      ? "text-gray-900 font-medium after:absolute after:bottom-0 after:inset-x-3 after:h-0.5 after:bg-gray-900 after:rounded-t"
                      : "text-gray-500 hover:text-gray-800",
                  ].join(" ")
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
