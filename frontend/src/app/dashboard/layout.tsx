"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore, useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import {
    LayoutDashboard,
    Smartphone,
    MessageSquare,
    Users,
    Bot,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    Zap,
    Bell
} from "lucide-react";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/whatsapp", icon: Smartphone, label: "WhatsApp" },
    { href: "/dashboard/conversations", icon: MessageSquare, label: "Conversaciones" },
    { href: "/dashboard/contacts", icon: Users, label: "Contactos" },
    { href: "/dashboard/automations", icon: Bot, label: "Automatizaciones" },
    { href: "/dashboard/leads", icon: BarChart3, label: "Pedidos IA" },
    { href: "/dashboard/settings", icon: Settings, label: "Configuración" },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, isLoading, setAuth, setUser, setLoading, logout } = useAuthStore();
    const { sidebarOpen, toggleSidebar } = useAppStore();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    // Mock unread count
    const unreadCount = 3;

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setLoading(false);
            router.push("/login");
            return;
        }

        api
            .getMe()
            .then((res) => {
                setAuth(res.user, token);
                connectSocket(res.user.id);
            })
            .catch(() => {
                logout();
                router.push("/login");
            });

        return () => {
            disconnectSocket();
        };
    }, []);

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-950 gradient-mesh">
                <div className="flex flex-col items-center gap-4 animate-fadeIn">
                    <div className="w-14 h-14 rounded-2xl gradient-whatsapp flex items-center justify-center animate-pulse-glow">
                        <MessageSquare className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex items-center gap-2 text-dark-400">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-whatsapp)] animate-pulse" />
                        Cargando...
                    </div>
                </div>
            </div>
        );
    }

    const handleLogout = () => {
        disconnectSocket();
        logout();
        router.push("/login");
    };

    return (
        <div className="min-h-screen flex bg-dark-950">
            {/* Sidebar - Desktop */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "w-64" : "w-20"
                    } bg-dark-900/95 border-r border-dark-800/50 backdrop-blur-xl hidden lg:flex`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-5 border-b border-dark-800/50">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl gradient-whatsapp flex items-center justify-center shrink-0 shadow-lg shadow-[var(--color-whatsapp)]/10">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        {sidebarOpen && (
                            <span className="text-lg font-bold text-white truncate animate-fadeIn">
                                Whats<span className="text-[var(--color-whatsapp)]">Bot</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? "bg-primary-600/15 text-primary-400 border border-primary-500/20"
                                    : "text-dark-400 hover:text-white hover:bg-dark-800/60"
                                    }`}
                            >
                                <item.icon
                                    className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "text-primary-400" : "text-dark-500 group-hover:text-dark-300"
                                        }`}
                                 />
                                {sidebarOpen && <span className="truncate">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section (Condensed) */}
                <div className="p-3 border-t border-dark-800/50">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dark-400 hover:text-danger-500 hover:bg-danger-500/10 transition-all ${sidebarOpen ? "" : "justify-center"
                            }`}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {sidebarOpen && <span>Cerrar Sesión</span>}
                    </button>
                </div>

                {/* Toggle button */}
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-all"
                >
                    <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
                </button>
            </aside>

            {/* Main content area */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
                {/* Desktop/Mobile Header */}
                <header className="h-16 glass sticky top-0 z-30 flex items-center justify-between px-6 border-b border-dark-800/50">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Toggle */}
                        <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-dark-400 hover:text-white">
                            <Menu className="w-6 h-6" />
                        </button>

                        <h2 className="text-sm font-medium text-dark-300 hidden sm:block">
                            {navItems.find(item => pathname === item.href)?.label || "Dashboard"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notifications Bell */}
                        <div className="relative">
                            <button
                                onClick={() => setNotificationsOpen(!notificationsOpen)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${notificationsOpen ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:bg-dark-800 hover:text-white'}`}
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500 ring-4 ring-dark-900 animate-pulse" />
                                )}
                            </button>

                            {/* Notifications Dropdown (Simplified) */}
                            {notificationsOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-80 bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-zoomIn">
                                        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
                                            <h3 className="font-bold text-white text-sm">Notificaciones</h3>
                                            <Link href="/dashboard/notifications" onClick={() => setNotificationsOpen(false)} className="text-xs text-primary-400 hover:underline">Ver todas</Link>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            <div className="p-4 text-center text-dark-500 text-sm">
                                                No hay notificaciones nuevas
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* AI Assistant shortcut */}
                        <button className="w-10 h-10 rounded-xl flex items-center justify-center text-dark-400 hover:bg-dark-800 hover:text-white transition-all group">
                             <Zap className="w-5 h-5 group-hover:text-amber-400" />
                        </button>

                        <div className="w-px h-6 bg-dark-800 mx-1" />

                        {/* User Profile */}
                        <div className="flex items-center gap-3 pl-2">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-xs font-semibold text-white">{user?.name}</span>
                                <span className="text-[10px] text-dark-500 capitalize">{user?.plan || 'Free'} Plan</span>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-primary-500/10">
                                {user?.name?.[0]?.toUpperCase() || "U"}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main page content */}
                <main className="p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
                    {children}
                </main>
            </div>

            {/* Mobile sidebar overlay (Simplified) */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                    <aside className="absolute left-0 inset-y-0 w-72 bg-dark-900 border-r border-dark-800/50 p-4 animate-slideIn">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl gradient-whatsapp flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-lg font-bold text-white">WhatsBot</span>
                            </div>
                            <button onClick={() => setMobileMenuOpen(false)} className="text-dark-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <nav className="space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === item.href ? "bg-primary-600/15 text-primary-400" : "text-dark-400"}`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}
        </div>
    );
}
