"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    BarChart3, TrendingUp, Users, MessageSquare,
    ArrowDownLeft, ArrowUpRight, Clock, Phone, Zap,
    Activity, Loader2,
} from "lucide-react";

interface Overview {
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
    totalContacts: number;
    totalSessions: number;
    activeSessions: number;
    totalAutomations: number;
    enabledAutomations: number;
    responseRate: number;
}

interface DayData {
    date: string;
    inbound: number;
    outbound: number;
    total: number;
}

interface HourData {
    hour: number;
    label: string;
    inbound: number;
    outbound: number;
    total: number;
}

interface TopContact {
    id: string;
    phone: string;
    name: string | null;
    totalMessages: number;
    lastMessage: string | null;
    lastMessagePreview: string | null;
}

export default function ReportsPage() {
    const [overview, setOverview] = useState<Overview | null>(null);
    const [byDay, setByDay] = useState<DayData[]>([]);
    const [byHour, setByHour] = useState<HourData[]>([]);
    const [topContacts, setTopContacts] = useState<TopContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(14);

    useEffect(() => {
        loadAll();
    }, [period]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [ov, days, hours, contacts] = await Promise.all([
                api.getReportsOverview(),
                api.getMessagesByDay(period),
                api.getMessagesByHour(),
                api.getTopContacts(8),
            ]);
            setOverview(ov.overview);
            setByDay(days.messagesByDay);
            setByHour(hours.messagesByHour);
            setTopContacts(contacts.topContacts);
        } catch (err) {
            console.error("Error loading reports:", err);
        } finally {
            setLoading(false);
        }
    };

    const maxDayTotal = Math.max(...byDay.map((d) => d.total), 1);
    const maxHourTotal = Math.max(...byHour.map((h) => h.total), 1);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("es", { day: "2-digit", month: "short" });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
                    <p className="text-dark-400">Cargando reportes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <BarChart3 className="w-7 h-7 text-primary-400" />
                        Reportes
                    </h1>
                    <p className="text-dark-400 text-sm mt-1">
                        Analítica de tu actividad en WhatsApp
                    </p>
                </div>
                <div className="flex gap-2">
                    {[7, 14, 30].map((d) => (
                        <button
                            key={d}
                            onClick={() => setPeriod(d)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${period === d
                                    ? "gradient-primary text-white shadow-lg shadow-primary-600/20"
                                    : "bg-dark-800/60 text-dark-400 hover:text-white hover:bg-dark-700/60"
                                }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<MessageSquare className="w-5 h-5" />}
                    label="Total Mensajes"
                    value={overview?.totalMessages || 0}
                    color="primary"
                />
                <StatCard
                    icon={<ArrowDownLeft className="w-5 h-5" />}
                    label="Recibidos"
                    value={overview?.inboundMessages || 0}
                    color="whatsapp"
                    sub={`${overview?.responseRate || 0}% tasa respuesta`}
                />
                <StatCard
                    icon={<ArrowUpRight className="w-5 h-5" />}
                    label="Enviados"
                    value={overview?.outboundMessages || 0}
                    color="accent"
                />
                <StatCard
                    icon={<Users className="w-5 h-5" />}
                    label="Contactos"
                    value={overview?.totalContacts || 0}
                    color="warning"
                />
            </div>

            {/* Mini stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MiniStat label="Sesiones activas" value={`${overview?.activeSessions || 0} / ${overview?.totalSessions || 0}`} icon={<Phone className="w-4 h-4" />} />
                <MiniStat label="Automatizaciones activas" value={`${overview?.enabledAutomations || 0} / ${overview?.totalAutomations || 0}`} icon={<Zap className="w-4 h-4" />} />
                <MiniStat label="Promedio/día" value={`${byDay.length > 0 ? Math.round(byDay.reduce((s, d) => s + d.total, 0) / byDay.length) : 0} msgs`} icon={<Activity className="w-4 h-4" />} />
                <MiniStat label="Hora más activa" value={byHour.length > 0 ? byHour.reduce((max, h) => (h.total > max.total ? h : max), byHour[0]).label : "—"} icon={<Clock className="w-4 h-4" />} />
            </div>

            {/* Messages by Day Chart */}
            <div className="p-6 rounded-2xl glass-light">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary-400" />
                            Mensajes por Día
                        </h3>
                        <p className="text-dark-500 text-xs mt-1">
                            Últimos {period} días
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-[var(--color-whatsapp)]" />
                            Recibidos
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-primary-500" />
                            Enviados
                        </span>
                    </div>
                </div>

                <div className="flex items-end gap-[3px] h-48">
                    {byDay.map((d, i) => (
                        <div
                            key={d.date}
                            className="flex-1 flex flex-col items-center gap-0 group relative"
                        >
                            {/* Tooltip */}
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                                <p className="text-white font-medium">{formatDate(d.date)}</p>
                                <p className="text-[var(--color-whatsapp)]">↓ {d.inbound} recibidos</p>
                                <p className="text-primary-400">↑ {d.outbound} enviados</p>
                            </div>

                            {/* Bars */}
                            <div className="w-full flex flex-col-reverse gap-[1px]">
                                <div
                                    className="w-full rounded-t-sm transition-all duration-300"
                                    style={{
                                        height: `${Math.max((d.inbound / maxDayTotal) * 160, d.inbound > 0 ? 4 : 0)}px`,
                                        background: "var(--color-whatsapp)",
                                        opacity: 0.85,
                                        animationDelay: `${i * 30}ms`,
                                    }}
                                />
                                <div
                                    className="w-full rounded-t-sm transition-all duration-300"
                                    style={{
                                        height: `${Math.max((d.outbound / maxDayTotal) * 160, d.outbound > 0 ? 4 : 0)}px`,
                                        background: "var(--color-primary-500)",
                                        opacity: 0.85,
                                        animationDelay: `${i * 30}ms`,
                                    }}
                                />
                            </div>

                            {/* Date label */}
                            {(i % Math.max(Math.floor(byDay.length / 7), 1) === 0 || i === byDay.length - 1) && (
                                <span className="text-[10px] text-dark-600 mt-2 rotate-0">
                                    {formatDate(d.date)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Activity by Hour */}
                <div className="p-6 rounded-2xl glass-light">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                        <Clock className="w-5 h-5 text-accent-500" />
                        Actividad por Hora
                    </h3>
                    <p className="text-dark-500 text-xs mb-5">
                        Distribución de mensajes durante el día
                    </p>

                    <div className="flex items-end gap-[2px] h-36">
                        {byHour.map((h) => (
                            <div key={h.hour} className="flex-1 flex flex-col items-center group relative">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl">
                                    <p className="text-white font-medium">{h.label}</p>
                                    <p className="text-dark-400">{h.total} mensajes</p>
                                </div>
                                <div
                                    className="w-full rounded-t-sm transition-all duration-300 hover:opacity-100"
                                    style={{
                                        height: `${Math.max((h.total / maxHourTotal) * 120, h.total > 0 ? 3 : 0)}px`,
                                        background: `linear-gradient(to top, var(--color-accent-600), var(--color-whatsapp))`,
                                        opacity: 0.7,
                                    }}
                                />
                                {h.hour % 4 === 0 && (
                                    <span className="text-[9px] text-dark-600 mt-1.5">{h.label}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Contacts */}
                <div className="p-6 rounded-2xl glass-light">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                        <Users className="w-5 h-5 text-warning-500" />
                        Top Contactos
                    </h3>
                    <p className="text-dark-500 text-xs mb-5">
                        Contactos con más mensajes
                    </p>

                    {topContacts.length === 0 ? (
                        <div className="text-center py-10">
                            <Users className="w-10 h-10 text-dark-700 mx-auto mb-3" />
                            <p className="text-dark-500 text-sm">Sin datos aún</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {topContacts.map((c, i) => {
                                const maxMsgs = topContacts[0]?.totalMessages || 1;
                                return (
                                    <div key={c.id} className="flex items-center gap-3 group">
                                        <span className="text-xs text-dark-600 w-5 text-right font-mono">
                                            {i + 1}
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {c.name?.[0]?.toUpperCase() || "?"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {c.name || c.phone}
                                                </p>
                                                <span className="text-xs text-dark-400 ml-2 shrink-0">
                                                    {c.totalMessages} msgs
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${(c.totalMessages / maxMsgs) * 100}%`,
                                                        background: `linear-gradient(90deg, var(--color-primary-600), var(--color-primary-400))`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl glass-light text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--color-whatsapp)]/15 flex items-center justify-center mb-3">
                        <MessageSquare className="w-6 h-6 text-[var(--color-whatsapp)]" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {byDay.reduce((s, d) => s + d.total, 0)}
                    </p>
                    <p className="text-dark-400 text-xs mt-1">
                        Mensajes en {period} días
                    </p>
                </div>
                <div className="p-5 rounded-2xl glass-light text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-500/15 flex items-center justify-center mb-3">
                        <TrendingUp className="w-6 h-6 text-primary-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {byDay.length > 0 ? Math.round(byDay.reduce((s, d) => s + d.total, 0) / byDay.length) : 0}
                    </p>
                    <p className="text-dark-400 text-xs mt-1">Promedio diario</p>
                </div>
                <div className="p-5 rounded-2xl glass-light text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-accent-500/15 flex items-center justify-center mb-3">
                        <Clock className="w-6 h-6 text-accent-500" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {byDay.filter((d) => d.total > 0).length}
                    </p>
                    <p className="text-dark-400 text-xs mt-1">Días activos</p>
                </div>
            </div>
        </div>
    );
}

/* Stat Card Component */
function StatCard({
    icon,
    label,
    value,
    color,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    sub?: string;
}) {
    const colors: Record<string, string> = {
        primary: "from-primary-600/20 to-primary-500/5 border-primary-500/20",
        whatsapp: "from-[var(--color-whatsapp)]/20 to-[var(--color-whatsapp)]/5 border-[var(--color-whatsapp)]/20",
        accent: "from-accent-500/20 to-accent-500/5 border-accent-500/20",
        warning: "from-[var(--color-warning-500)]/20 to-[var(--color-warning-500)]/5 border-[var(--color-warning-500)]/20",
    };
    const iconColors: Record<string, string> = {
        primary: "text-primary-400",
        whatsapp: "text-[var(--color-whatsapp)]",
        accent: "text-accent-400",
        warning: "text-[var(--color-warning-500)]",
    };

    return (
        <div className={`p-5 rounded-2xl bg-gradient-to-br ${colors[color]} border transition-all hover:scale-[1.02] animate-fadeIn`}>
            <div className="flex items-center gap-2 mb-3">
                <span className={iconColors[color]}>{icon}</span>
                <p className="text-dark-400 text-xs font-medium">{label}</p>
            </div>
            <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
            {sub && <p className="text-xs text-dark-500 mt-1">{sub}</p>}
        </div>
    );
}

/* Mini Stat Component */
function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-dark-800/40 border border-dark-700/20">
            <span className="text-dark-500">{icon}</span>
            <div>
                <p className="text-xs text-dark-500">{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
            </div>
        </div>
    );
}
