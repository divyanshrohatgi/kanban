import React, { useState, useMemo } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { NotificationsDropdown } from "../notifications/NotificationsDropdown";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  const initials = useMemo(() => {
    const name = user?.username || "";
    if (!name) return "";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? "").join("");
  }, [user]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-lg shadow-2xl supports-[backdrop-filter]:bg-gradient-to-r supports-[backdrop-filter]:from-slate-900/80 supports-[backdrop-filter]:via-blue-900/80 supports-[backdrop-filter]:to-indigo-900/80">
      {/* Skip link for accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-gray-900"
      >
        Skip to content
      </a>

      <nav aria-label="Primary">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">K</span>
                </div>
                <Link
                  to="/"
                  className="text-2xl font-bold tracking-tight text-white hover:text-blue-300 transition-all duration-300 hover:scale-105"
                >
                  Kanban Pro
                </Link>
              </div>
            </div>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-6">
              {user ? (
                <>
                  <NavLink
                    to="/boards"
                    className={({ isActive }) =>
                      [
                        "rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105",
                        isActive
                          ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                          : "text-white/80 hover:text-white hover:bg-white/10 hover:backdrop-blur-sm",
                      ].join(" ")
                    }
                  >
                    📋 Boards
                  </NavLink>

                  <NotificationsDropdown />

                  {/* User pill */}
                  <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white shadow-lg ring-2 ring-white/20 hover:scale-110 transition-transform"
                      aria-hidden
                      title={user.username}
                    >
                      {initials || "U"}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{user.username}</span>
                      <span className="text-xs text-white/60">Online</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleLogout}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 font-semibold px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    asChild
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 font-semibold px-6 py-2.5 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <Link to="/login">Login / Sign Up</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <div className="md:hidden">
              <Button
                variant="outline"
                aria-label="Toggle menu"
                aria-expanded={open}
                onClick={() => setOpen(v => !v)}
                className="border-white/30 text-white hover:bg-white hover:text-gray-900 rounded-lg shadow-lg transition-all duration-300 hover:scale-105"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {open ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </Button>
            </div>
          </div>

          {/* Mobile menu */}
          {open && (
            <div className="md:hidden pb-4">
              <div className="mt-3 space-y-3 rounded-xl border border-white/20 bg-gradient-to-br from-slate-800/90 to-blue-900/90 backdrop-blur-lg p-4 shadow-2xl">
                {user ? (
                  <>
                    <NavLink
                      to="/boards"
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        [
                          "block rounded-lg px-4 py-3 text-sm font-semibold transition-all",
                          isActive
                            ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                            : "text-white/80 hover:text-white hover:bg-white/10 hover:backdrop-blur-sm",
                        ].join(" ")
                      }
                    >
                      📋 Boards
                    </NavLink>

                    <div className="flex items-center justify-between rounded-lg px-4 py-3 bg-white/10 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white shadow-lg">
                          {initials || "U"}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">{user.username}</span>
                          <span className="text-xs text-white/60">Online</span>
                        </div>
                      </div>
                      <NotificationsDropdown />
                    </div>

                    <Button
                      onClick={handleLogout}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold px-4 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
                    >
                      Logout
                    </Button>

                  </>
                ) : (
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 font-semibold px-6 py-3 rounded-lg transition-all shadow-lg"
                    onClick={() => setOpen(false)}
                  >
                    <Link to="/login">Login / Sign Up</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
