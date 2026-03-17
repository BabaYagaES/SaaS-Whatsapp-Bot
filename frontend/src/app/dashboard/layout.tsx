"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore, useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
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
    Bell,
    Image as ImageIcon,
    Sparkles
} from "lucide-react";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/whatsapp", icon: Smartphone, label: "WhatsApp" },
    { href: "/dashboard/conversations", icon: MessageSquare, label: "Conversaciones" },
    { href: "/dashboard/contacts", icon: Users, label: "Contactos" },
    { href: "/dashboard/automations", icon: Bot, label: "Automatizaciones" },
    { href: "/dashboard/leads", icon: BarChart3, label: "Pedidos IA" },
    { href: "/dashboard/gallery", icon: ImageIcon, label: "Galería" },
    { href: "/dashboard/settings", icon: Settings, label: "Configuración" },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, isLoading, setAuth, logout, setLoading } = useAuthStore();
    const { sidebarOpen, toggleSidebar } = useAppStore();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const res = await api.getNotifications();
            setNotifications(res.notifications);
            setUnreadCount(res.notifications.filter((n: any) => !n.isRead).length);
        } catch (e) {
            console.error(e);
        }
    };

    const markAllRead = async () => {
        try {
            await api.markAllNotificationsRead();
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (e) {
            console.error(e);
        }
    };

    const markOneRead = async (id: string, link?: string) => {
        try {
            await api.markNotificationRead(id);
            setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            if (link) {
                router.push(link);
                setNotificationsOpen(false);
            }
        } catch (e) {
            console.error(e);
        }
    };

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
                const s = connectSocket(res.user.id);
                
                s.on('notification:new', (notif: any) => {
                    setNotifications(prev => [notif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                });

                fetchNotifications();
            })
            .catch(() => {
                logout();
                router.push("/login");
            });

        return () => {
            const s = getSocket();
            s.off('notification:new');
            disconnectSocket();
        };
    }, []);

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-950 gradient-mesh">
                <div className="flex flex-col items-center gap-4 animate-fadeIn">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center animate-pulse-glow shadow-lg shadow-green-500/20">
                        <Zap className="w-7 h-7 text-white fill-white/20" />
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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/10">
                            <Zap className="w-5 h-5 text-white fill-white/20" />
                        </div>
                        {sidebarOpen && (
                            <span className="text-xl font-black text-white truncate animate-fadeIn tracking-tight">
                                Zap<span className="text-green-400">py</span>
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

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Notifications Bell */}
                        <div className="relative">
                            <button
                                onClick={() => setNotificationsOpen(!notificationsOpen)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${notificationsOpen ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:bg-dark-800 hover:text-white'}`}
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary-500 ring-4 ring-dark-900 animate-pulse shadow-lg shadow-primary-500/50" />
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {notificationsOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                                    <div className="absolute right-0 mt-3 w-80 bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-zoomIn">
                                        <div className="p-5 border-b border-dark-800 flex items-center justify-between bg-dark-900/50 px-6">
                                            <h3 className="font-bold text-white text-sm">Notificaciones</h3>
                                            {unreadCount > 0 && (
                                                <button onClick={markAllRead} className="text-[10px] text-primary-400 hover:text-primary-300 font-bold uppercase tracking-wider">Marcar leídas</button>
                                            )}
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-10 text-center">
                                                    <Bell className="w-10 h-10 text-dark-800 mx-auto mb-3" />
                                                    <p className="text-dark-500 text-sm">No tienes notificaciones</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-dark-800/50">
                                                    {notifications.map((notif) => (
                                                        <button 
                                                            key={notif.id} 
                                                            onClick={() => markOneRead(notif.id, notif.link)}
                                                            className={`w-full text-left flex flex-col p-4 px-6 hover:bg-dark-800/60 transition-all relative ${!notif.isRead ? 'bg-primary-500/5' : ''}`}
                                                        >
                                                            {!notif.isRead && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-lg shadow-primary-500/50" />}
                                                            <p className={`text-sm font-semibold ${!notif.isRead ? 'text-white' : 'text-dark-300'}`}>{notif.title}</p>
                                                            <p className="text-xs text-dark-500 mt-1 line-clamp-2">{notif.message}</p>
                                                            <p className="text-[10px] text-dark-600 mt-2 font-medium uppercase tracking-wider">
                                                                {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* AI Assistant shortcut */}
                        <button 
                            onClick={() => setAiPanelOpen(true)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${aiPanelOpen ? 'bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/10' : 'text-dark-400 hover:bg-dark-800 hover:text-white'} group`}
                        >
                             <Zap className={`w-5 h-5 ${aiPanelOpen ? 'text-amber-400 fill-amber-400/20' : 'group-hover:text-amber-400'}`} />
                        </button>

                        <div className="w-px h-8 bg-dark-800 mx-1 hidden sm:block" />

                        {/* User Profile - Premium Style */}
                        <div className="relative">
                            <button 
                                onClick={() => setProfileOpen(!profileOpen)}
                                className={`flex items-center gap-3 p-1.5 pr-3 rounded-2xl transition-all ${profileOpen ? 'bg-dark-800 ring-1 ring-dark-700' : 'hover:bg-dark-800/60'}`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg 
                                    ${user?.plan === 'ENTERPRISE' ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-amber-500/20' : 
                                      user?.plan === 'PRO' ? 'bg-gradient-to-br from-primary-500 to-accent-500 shadow-primary-500/20' :
                                      'bg-gradient-to-br from-dark-600 to-dark-700'}`}
                                >
                                    {user?.name?.[0]?.toUpperCase() || "U"}
                                </div>
                                <div className="flex flex-col items-start hidden sm:flex">
                                    <span className="text-xs font-bold text-white leading-tight">{user?.name}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider 
                                        ${user?.plan === 'ENTERPRISE' ? 'text-amber-500' : 
                                          user?.plan === 'PRO' ? 'text-primary-400' :
                                          'text-dark-500'}`}
                                    >
                                        {user?.plan || 'Free'} Plan
                                    </span>
                                </div>
                            </button>

                            {/* Profile Dropdown */}
                            {profileOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                                    <div className="absolute right-0 mt-3 w-56 bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-zoomIn">
                                        <div className="p-4 bg-dark-800/40 border-b border-dark-800/60">
                                            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                                            <p className="text-xs text-dark-500 truncate">{user?.email}</p>
                                        </div>
                                        <div className="p-2">
                                            <Link 
                                                href="/dashboard/settings" 
                                                onClick={() => setProfileOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dark-300 hover:bg-dark-800 hover:text-white transition-all"
                                            >
                                                <Settings className="w-4 h-4" /> Perfil y Cuenta
                                            </Link>
                                            <Link 
                                                href="/dashboard/whatsapp" 
                                                onClick={() => setProfileOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dark-300 hover:bg-dark-800 hover:text-white transition-all"
                                            >
                                                <Smartphone className="w-4 h-4" /> Mis WhatsApps
                                            </Link>
                                        </div>
                                        <div className="p-2 border-t border-dark-800/60 bg-dark-900/50">
                                            <button 
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-danger-500 hover:bg-danger-500/10 transition-all"
                                            >
                                                <LogOut className="w-4 h-4" /> Cerrar Sesión
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
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
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white fill-white/20" />
                            </div>
                            <span className="text-lg font-bold text-white">Zappy</span>
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

            {/* AI Assistant Quick Panel */}
            {aiPanelOpen && (
                <div className="fixed inset-y-0 right-0 z-[100] w-full max-w-sm bg-dark-900 border-l border-dark-800 shadow-2xl animate-slideInRight flex flex-col">
                    <div className="p-6 border-b border-dark-800 flex items-center justify-between bg-dark-950/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Asistente AI</h3>
                                <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest">Estado Premium</p>
                            </div>
                        </div>
                        <button onClick={() => setAiPanelOpen(false)} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 rounded-3xl bg-dark-800/40 border border-dark-700">
                             <Sparkles className="w-8 h-8 text-primary-400 mb-2 mx-auto" />
                             <p className="text-sm text-dark-300 px-4">Esta es tu consola de comandos IA. Próximamente podrás entrenar a tu bot en tiempo real desde aquí.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <div className="p-4 rounded-2xl bg-dark-800/60 border border-dark-700 text-left">
                                <p className="text-xs text-dark-500 mb-1">AI IA Activada</p>
                                <p className="text-lg font-bold text-[var(--color-whatsapp)]">Sí</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-dark-800/60 border border-dark-700 text-left">
                                <p className="text-xs text-dark-500 mb-1">Capacidad</p>
                                <p className="text-lg font-bold text-white">98%</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-dark-800">
                        <Link 
                            href="/dashboard/ai-stats" 
                            className="w-full py-3 rounded-xl bg-dark-800 border border-dark-700 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-dark-700 transition-all"
                        >
                            Ver Análisis Completo
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
