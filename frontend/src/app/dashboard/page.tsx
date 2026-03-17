"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
    Smartphone,
    MessageSquare,
    Users,
    Bot,
    TrendingUp,
    ArrowUpRight,
    Zap,
    Activity,
} from "lucide-react";
import Link from "next/link";
import BusinessOnboarding from "./components/BusinessOnboarding";

interface Stats {
    totalSessions: number;
    activeSessions: number;
    totalContacts: number;
    totalMessages: number;
    totalAutomations: number;
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Check if user needs onboarding
        if (user && !user.businessType) {
            setShowOnboarding(true);
        }

        api
            .getStats()
            .then((res) => setStats(res.stats))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user]);

    const statCards = [
        {
            label: "Sesiones WhatsApp",
            value: stats?.totalSessions || 0,
            subValue: `${stats?.activeSessions || 0} activas`,
            icon: Smartphone,
            color: "var(--color-whatsapp)",
            href: "/dashboard/whatsapp",
        },
        {
            label: "Mensajes Totales",
            value: stats?.totalMessages || 0,
            subValue: "enviados y recibidos",
            icon: MessageSquare,
            color: "var(--color-primary-500)",
            href: "/dashboard/conversations",
        },
        {
            label: "Contactos",
            value: stats?.totalContacts || 0,
            subValue: "guardados",
            icon: Users,
            color: "var(--color-accent-500)",
            href: "/dashboard/contacts",
        },
        {
            label: "Automatizaciones",
            value: stats?.totalAutomations || 0,
            subValue: "configuradas",
            icon: Bot,
            color: "var(--color-warning-500)",
            href: "/dashboard/automations",
        },
    ];

    const quickActions = [
        {
            label: "Conectar WhatsApp",
            desc: "Escanea un código QR para conectar",
            icon: Smartphone,
            href: "/dashboard/whatsapp",
            color: "var(--color-whatsapp)",
        },
        {
            label: "Nueva Automatización",
            desc: "Configura respuestas automáticas",
            icon: Bot,
            href: "/dashboard/automations",
            color: "var(--color-primary-500)",
        },
        {
            label: "Ver Mensajes",
            desc: "Revisa tus conversaciones recientes",
            icon: MessageSquare,
            href: "/dashboard/conversations",
            color: "var(--color-accent-500)",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Welcome header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="animate-fadeIn">
                    <h1 className="text-3xl font-bold text-white mb-1">
                        Hola, {user?.name || "Usuario"} 👋
                    </h1>
                    <p className="text-dark-400">
                        Bienvenido a tu panel de control de Zappy
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass-light text-sm animate-fadeIn stagger-1">
                    <Activity className="w-4 h-4 text-[var(--color-whatsapp)]" />
                    <span className="text-dark-300">
                        Plan:{" "}
                        <span className="font-semibold text-white">{user?.plan || "FREE"}</span>
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="group p-5 rounded-2xl glass-light hover:bg-dark-800/60 transition-all duration-300 hover:-translate-y-0.5 animate-fadeIn"
                        style={{ animationDelay: `${i * 0.08}s` }}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                style={{ backgroundColor: `${stat.color}15` }}
                            >
                                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                            </div>
                            <ArrowUpRight
                                className="w-4 h-4 text-dark-600 group-hover:text-dark-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            />
                        </div>
                        <p className="text-2xl font-bold text-white mb-0.5">
                            {loading ? (
                                <span className="inline-block w-12 h-7 rounded bg-dark-700 animate-pulse" />
                            ) : (
                                stat.value.toLocaleString()
                            )}
                        </p>
                        <p className="text-sm text-dark-500">{stat.label}</p>
                        <p className="text-xs text-dark-600 mt-1">{stat.subValue}</p>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[var(--color-whatsapp)]" />
                    Acciones Rápidas
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                    {quickActions.map((action, i) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className="group flex items-center gap-4 p-5 rounded-2xl glass-light hover:bg-dark-800/60 transition-all duration-300 hover:-translate-y-0.5 animate-fadeIn"
                            style={{ animationDelay: `${(i + 4) * 0.08}s` }}
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                style={{ backgroundColor: `${action.color}15` }}
                            >
                                <action.icon className="w-6 h-6" style={{ color: action.color }} />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-white group-hover:text-primary-300 transition-colors">
                                    {action.label}
                                </p>
                                <p className="text-sm text-dark-500 truncate">{action.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Getting Started Guide */}
            <div className="p-6 rounded-2xl glass-light relative overflow-hidden animate-fadeIn stagger-5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--color-whatsapp)]/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[var(--color-whatsapp)]" />
                        Primeros Pasos
                    </h2>
                    <div className="space-y-3 mt-4">
                        {[
                            { step: 1, text: "Conecta tu WhatsApp escaneando el código QR", done: (stats?.totalSessions || 0) > 0 },
                            { step: 2, text: "Envía tu primer mensaje desde el panel", done: (stats?.totalMessages || 0) > 0 },
                            { step: 3, text: "Configura una automatización de respuesta", done: (stats?.totalAutomations || 0) > 0 },
                        ].map((item) => (
                            <div key={item.step} className="flex items-center gap-3">
                                <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${item.done
                                            ? "bg-[var(--color-whatsapp)]/20 text-[var(--color-whatsapp)]"
                                            : "bg-dark-800 text-dark-500"
                                        }`}
                                >
                                    {item.done ? "✓" : item.step}
                                </div>
                                <p className={`text-sm ${item.done ? "text-dark-300 line-through" : "text-dark-400"}`}>
                                    {item.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showOnboarding && <BusinessOnboarding onComplete={() => setShowOnboarding(false)} />}
        </div>
    );
}
