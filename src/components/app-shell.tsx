'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  LayoutDashboard,
  Plug,
  Database,
  Lightbulb,
  MessageSquare,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Circle,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useCortexStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/use-mobile';
import type { NavView } from '@/lib/types';

import DashboardView from '@/components/views/dashboard-view';
import ConnectorsView from '@/components/views/connectors-view';
import MemoryView from '@/components/views/memory-view';
import InsightsView from '@/components/views/insights-view';
import ChatView from '@/components/views/chat-view';
import AgentsView from '@/components/views/agents-view';
import SettingsView from '@/components/views/settings-view';

// ─── Navigation Config ─────────────────────────────────────────────────────

interface NavItem {
  view: NavView;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'connectors', label: 'Connectors', icon: Plug },
  { view: 'memory', label: 'Memory', icon: Database },
  { view: 'insights', label: 'Insights', icon: Lightbulb },
  { view: 'chat', label: 'Chat', icon: MessageSquare },
  { view: 'agents', label: 'Agents', icon: Bot },
  { view: 'settings', label: 'Settings', icon: Settings },
];

const VIEW_TITLES: Record<NavView, string> = {
  dashboard: 'Dashboard',
  connectors: 'Connectors',
  memory: 'Memory',
  insights: 'Insights',
  chat: 'Chat',
  agents: 'Agents',
  settings: 'Settings',
};

// ─── View Map ──────────────────────────────────────────────────────────────

const VIEW_COMPONENTS: Record<NavView, React.ComponentType> = {
  dashboard: DashboardView,
  connectors: ConnectorsView,
  memory: MemoryView,
  insights: InsightsView,
  chat: ChatView,
  agents: AgentsView,
  settings: SettingsView,
};

// ─── Sidebar ───────────────────────────────────────────────────────────────

function Sidebar() {
  const isMobile = useIsMobile();
  const { sidebarOpen, toggleSidebar, setSidebarOpen, currentView } = useCortexStore();
  const { theme, setTheme } = useTheme();

  const sidebarWidth = sidebarOpen ? 240 : 64;

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, setSidebarOpen]);

  // Close mobile sidebar on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, sidebarOpen, setSidebarOpen]);

  const handleNavClick = (view: NavView) => {
    useCortexStore.getState().setCurrentView(view);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const sidebarContent = (
    <div
      className={`flex flex-col h-full bg-card border-r border-border ${
        isMobile ? 'w-[240px]' : ''
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 py-4 h-14 shrink-0">
        <div className="flex items-center justify-center size-8 shrink-0 rounded-md overflow-hidden">
          <Image src="/cortex-logo.png" alt="Cortex" width={32} height={32} className="object-cover" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  Cortex
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Second Brain Agent Network
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Mobile close button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-7 shrink-0"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <li key={item.view}>
                {sidebarOpen || isMobile ? (
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 h-9 px-3 ${isActive ? 'bg-accent text-accent-foreground font-medium' : ''}`}
                    onClick={() => handleNavClick(item.view)}
                  >
                    <Icon className="size-4 shrink-0" />
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden whitespace-nowrap text-sm"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`w-full justify-center h-9 ${isActive ? 'bg-accent text-accent-foreground' : ''}`}
                        onClick={() => handleNavClick(item.view)}
                      >
                        <Icon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      {/* Bottom Section */}
      <div className="shrink-0 px-2 py-3">
        {/* System Status */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <Circle className="size-2 fill-emerald-500 text-emerald-500 shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-muted-foreground overflow-hidden whitespace-nowrap"
              >
                System Active
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Toggle + Collapse Toggle */}
        <div className="flex items-center gap-1 mt-1 px-1">
          {sidebarOpen || isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <Sun className="size-4 dark:hidden" />
              <Moon className="size-4 hidden dark:block" />
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  <Sun className="size-4 dark:hidden" />
                  <Moon className="size-4 hidden dark:block" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Toggle theme</TooltipContent>
            </Tooltip>
          )}

          {!isMobile && (
            sidebarOpen ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-auto shrink-0"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="size-4" />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 ml-auto shrink-0"
                    onClick={toggleSidebar}
                    aria-label="Expand sidebar"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            )
          )}
        </div>
      </div>
    </div>
  );

  // Mobile: overlay sidebar
  if (isMobile) {
    return (
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar drawer */}
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed left-0 top-0 z-50 h-full"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: fixed sidebar
  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed left-0 top-0 z-30 h-screen overflow-hidden"
    >
      {sidebarContent}
    </motion.aside>
  );
}

// ─── Main Content ──────────────────────────────────────────────────────────

function MainContent() {
  const isMobile = useIsMobile();
  const { currentView, sidebarOpen } = useCortexStore();

  const sidebarWidth = sidebarOpen ? 240 : 64;
  const marginLeft = isMobile ? 0 : sidebarWidth;

  const ViewComponent = VIEW_COMPONENTS[currentView];
  const viewTitle = VIEW_TITLES[currentView];

  return (
    <motion.main
      animate={{ marginLeft }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex-1 min-h-screen flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-4 h-14 px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border shrink-0">
        {/* Mobile menu button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => useCortexStore.getState().setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </Button>
        )}

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Cortex</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{viewTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Page Content */}
      <div className="flex-1 p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ViewComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.main>
  );
}

// ─── App Shell ─────────────────────────────────────────────────────────────

export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <MainContent />
    </div>
  );
}
