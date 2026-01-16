'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MobileNavBar } from './mobile-nav-bar';
import { MobileHeader } from './mobile-header';
import {
  Home,
  MessageSquare,
  Users,
  User as UserIcon,
  Settings,
  Bell,
  Search,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { UserNav } from './user-nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Card } from './ui/card';
import { GlobalSearch } from './global-search';
import { useChat } from '@/hooks/use-chat';
import { NotificationBell } from './notifications/notification-bell';


function OrbiLogo() {
  return (
    <Link href="/home" className="flex items-center gap-3 group">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400 group-hover:scale-105 transition-transform">
        <div className="w-full h-full bg-[url('/logo-splash.svg')] bg-no-repeat bg-center" />
      </div>
      <span className="text-xl font-bold font-headline hidden md:inline-block">
        Orbi
      </span>
    </Link>
  );
}

function MainNav({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const { userData } = useAuth();
  const { totalUnreadCount } = useChat();

  const navItems = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/communities', label: 'Communities', icon: Users },
    { href: '/messages', label: 'Messages', icon: MessageSquare, badge: totalUnreadCount },
    { href: userData?.username ? `/profile/${userData.username}` : '#', label: 'My Profile', icon: UserIcon },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const navClass = cn('flex flex-col gap-1', isMobile ? 'w-full' : '');

  return (
    <nav className={navClass}>
      {navItems.map(({ href, label, icon: Icon, badge }) => {
        const isActive = (href === '/home' && pathname === href) || (href !== '/home' && pathname.startsWith(href));
        const isDisabled = href === '#'

        return (
          <Button
            key={label}
            variant={isActive ? 'default' : 'ghost'}
            className={cn(
              "w-full justify-start text-base h-12",
              !isActive && "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
            asChild
            disabled={isDisabled}
          >
            <Link href={href}>
              <Icon className="mr-4 h-6 w-6" />
              <span className="flex-1">{label}</span>
              {badge && badge > 0 ? <Badge variant={isActive ? "secondary" : "default"} className="rounded-full">{badge}</Badge> : null}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const { authUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30">
        <p>Loading application...</p>
      </div>
    )
  }

  if (!authUser) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <MobileHeader />
      <header className="hidden md:block fixed top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 w-full">
          <div className="flex items-center w-[220px] lg:w-[240px] shrink-0">
            <div className="mr-4 md:hidden">
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              </Sheet>
            </div>
            <OrbiLogo />
          </div>

          {/* Centered Search Box */}
          <div className="hidden md:flex flex-1 max-w-xl mx-auto px-4">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="md:hidden">
              {/* Mobile Search Icon or similar if needed, but GlobalSearch is usually hidden on mobile header in this design */}
            </div>
            <div className="hidden md:block">
              <NotificationBell />
            </div>
            <UserNav onSheetOpenChange={setIsSheetOpen} />
          </div>
        </div>
      </header>

      <div className="flex-1 flex pt-14 w-full">
        {/* Fixed Left Sidebar */}
        <aside className="hidden md:block w-[220px] lg:w-[240px] h-full border-r overflow-y-auto no-scrollbar fixed left-0 top-14 bottom-0 z-30 bg-background">
          <div className="py-6 pr-6 lg:py-8 pl-4">
            <MainNav />
          </div>
        </aside>

        {/* Scrollable Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar md:pl-[220px] lg:pl-[240px] w-full">
          <div className="container py-6 mb-20 md:mb-0">
            {children}
          </div>
        </main>
      </div>

      <MobileNavBar />
    </div>
  );
}
