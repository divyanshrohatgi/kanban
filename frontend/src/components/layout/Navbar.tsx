import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { NotificationsDropdown } from "../notifications/NotificationsDropdown";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  return (
    <nav className="bg-gray-800 p-4 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          Kanban
        </Link>
        <div>
          {user ? (
            <div className="flex items-center space-x-4">
              <Link to="/boards" className="text-white/90 hover:text-white">Boards</Link>
              <NotificationsDropdown />
              <span className="text-lg">{user.username}</span>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-black border-white hover:bg-gray-700"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="space-x-4">
              <Link to="/login">
                <Button
                  variant="outline"
                  className="text-black border-white hover:bg-gray-700"
                >
                  Login / Sign Up
                </Button>{" "}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
