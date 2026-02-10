import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import { Menu, User, LogOut, LayoutDashboard, Trophy, Mountain, Footprints, Users, Settings, Heart } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const walkerLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/activity', label: 'Activity', icon: Footprints },
    { to: '/team', label: 'Team', icon: Users },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const publicLinks = [
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const links = user ? (user.role === 'admin' ? [
    { to: '/admin', label: 'Admin', icon: Settings },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ] : walkerLinks) : publicLinks;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200" data-testid="navbar">
      <div className="container-app flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
          <div className="w-9 h-9 rounded-full bg-orange-600 flex items-center justify-center">
            <Mountain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-stone-900 text-sm sm:text-base" style={{ fontFamily: "'Libre Baskerville', serif" }}>
            The Kenya Challenge
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link key={link.to} to={link.to} data-testid={`nav-${link.label.toLowerCase()}`}>
              <Button
                variant={isActive(link.to) ? 'default' : 'ghost'}
                size="sm"
                className={isActive(link.to)
                  ? 'rounded-full bg-orange-600 hover:bg-orange-700 text-white'
                  : 'rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }
              >
                <link.icon className="w-4 h-4 mr-1.5" />
                {link.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full gap-2 text-stone-700" data-testid="nav-user-menu">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-orange-700" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{user.display_name || user.first_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/profile')} data-testid="nav-profile-link">
                  <User className="w-4 h-4 mr-2" /> Profile
                </DropdownMenuItem>
                {user.role !== 'admin' && (
                  <DropdownMenuItem onClick={() => navigate(`/fundraise/${user.id}`)} data-testid="nav-fundraise-link">
                    <Heart className="w-4 h-4 mr-2" /> My Fundraising Page
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="nav-logout-btn">
                  <LogOut className="w-4 h-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex gap-2">
              <Link to="/login">
                <Button variant="ghost" className="rounded-full text-stone-600" data-testid="nav-login-btn">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="nav-signup-btn">
                  Join the Challenge
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" data-testid="nav-mobile-menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-2 mt-8">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    data-testid={`mobile-nav-${link.label.toLowerCase()}`}
                  >
                    <Button
                      variant={isActive(link.to) ? 'default' : 'ghost'}
                      className={`w-full justify-start rounded-xl ${isActive(link.to) ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'text-stone-700'}`}
                    >
                      <link.icon className="w-4 h-4 mr-3" />
                      {link.label}
                    </Button>
                  </Link>
                ))}
                {!user && (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start rounded-xl text-stone-700" data-testid="mobile-login-btn">
                        Log in
                      </Button>
                    </Link>
                    <Link to="/signup" onClick={() => setOpen(false)}>
                      <Button className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white" data-testid="mobile-signup-btn">
                        Join the Challenge
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
