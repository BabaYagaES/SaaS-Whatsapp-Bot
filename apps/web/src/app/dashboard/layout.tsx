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
} from "lucide-react";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/whatsapp", icon: Smartphone, label: "WhatsApp" },
    { href: "/dashboard/conversations", icon: MessageSquare, label: "Conversaciones" },
    { href: "/dashboard/contacts", icon: Users, label: "Contactos" },
    { href: "/dashboard/automations", icon: Bot, label: "Automatizaciones" },
    { href: "/dashboard/reports", icon: BarChart3, label: "Reportes" },
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

                {/* User section */}
                <div className="p-3 border-t border-dark-800/50">
                    <div className={`flex items-center gap-3 p-3 rounded-xl glass-light ${sidebarOpen ? "" : "justify-center"}`}>
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {user?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                <p className="text-xs text-dark-500 truncate">{user?.email}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className={`mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dark-400 hover:text-danger-500 hover:bg-danger-500/10 transition-all ${sidebarOpen ? "" : "justify-center"
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

            {/* Mobile header */}
            <div className="fixed top-0 left-0 right-0 h-16 glass z-30 flex items-center justify-between px-4 lg:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={() => setMobileMenuOpen(true)} className="text-dark-400 hover:text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg gradient-whatsapp flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-white">
                            Whats<span className="text-[var(--color-whatsapp)]">Bot</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Mobile sidebar overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                    <aside className="absolute left-0 inset-y-0 w-72 bg-dark-900 border-r border-dark-800/50 p-4 animate-slideIn">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl gradient-whatsapp flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-lg font-bold text-white">
                                    Whats<span className="text-[var(--color-whatsapp)]">Bot</span>
                                </span>
                            </div>
                            <button onClick={() => setMobileMenuOpen(false)} className="text-dark-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <nav className="space-y-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                            ? "bg-primary-600/15 text-primary-400 border border-primary-500/20"
                                            : "text-dark-400 hover:text-white hover:bg-dark-800/60"
                                            }`}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <button
                            onClick={handleLogout}
                            className="mt-8 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dark-400 hover:text-danger-500 hover:bg-danger-500/10 transition-all"
                        >
                            <LogOut className="w-5 h-5" />
                            Cerrar Sesión
                        </button>
                    </aside>
                </div>
            )}

            {/* Main content area */}
            <main
                className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"
                    } pt-16 lg:pt-0`}
            >
                <div className="p-6 lg:p-8 min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}
