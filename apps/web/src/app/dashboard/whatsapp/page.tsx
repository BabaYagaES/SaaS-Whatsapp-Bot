"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
    Smartphone,
    Plus,
    QrCode,
    Wifi,
    WifiOff,
    Trash2,
    Loader2,
    RefreshCw,
    Phone,
    MessageSquare,
} from "lucide-react";

interface Session {
    id: string;
    sessionName: string;
    status: string;
    phone: string | null;
    createdAt: string;
    _count?: { messages: number };
}

export default function WhatsAppPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [sessionName, setSessionName] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const loadSessions = async () => {
        try {
            const res = await api.getSessions();
            setSessions(res.sessions);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();

        const socket = getSocket();

        socket.on("whatsapp:qr", ({ sessionId, qr }: any) => {
            setQrCode(qr);
            setActiveSessionId(sessionId);
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? { ...s, status: "QR_READY" } : s))
            );
        });

        socket.on("whatsapp:ready", ({ sessionId, phone }: any) => {
            setQrCode(null);
            setActiveSessionId(null);
            setShowCreate(false);
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId ? { ...s, status: "CONNECTED", phone } : s
                )
            );
        });

        socket.on("whatsapp:disconnected", ({ sessionId }: any) => {
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId ? { ...s, status: "DISCONNECTED" } : s
                )
            );
        });

        return () => {
            socket.off("whatsapp:qr");
            socket.off("whatsapp:ready");
            socket.off("whatsapp:disconnected");
        };
    }, []);

    const handleCreateSession = async () => {
        if (!sessionName.trim()) return;
        setCreating(true);
        try {
            const res = await api.createSession(sessionName);
            setSessions((prev) => [res.session, ...prev]);
            setActiveSessionId(res.session.id);
            setSessionName("");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteSession = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta sesión?")) return;
        try {
            await api.deleteSession(id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
            if (activeSessionId === id) {
                setActiveSessionId(null);
                setQrCode(null);
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
        CONNECTED: { label: "Conectado", color: "var(--color-whatsapp)", icon: Wifi },
        QR_READY: { label: "Escanea el QR", color: "var(--color-warning-500)", icon: QrCode },
        CONNECTING: { label: "Conectando...", color: "var(--color-primary-500)", icon: RefreshCw },
        DISCONNECTED: { label: "Desconectado", color: "var(--color-dark-500)", icon: WifiOff },
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Smartphone className="w-7 h-7 text-[var(--color-whatsapp)]" />
                        WhatsApp
                    </h1>
                    <p className="text-dark-400 text-sm mt-1">Gestiona tus sesiones de WhatsApp</p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white gradient-whatsapp hover:opacity-90 transition-all shadow-lg shadow-[var(--color-whatsapp)]/20"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Sesión
                </button>
            </div>

            {/* Create session form */}
            {showCreate && (
                <div className="p-6 rounded-2xl glass-light animate-fadeIn">
                    <h3 className="text-lg font-semibold text-white mb-4">Crear Nueva Sesión</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            placeholder="Nombre de la sesión (ej: Mi WhatsApp)"
                            className="flex-1 px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-[var(--color-whatsapp)] focus:ring-1 focus:ring-[var(--color-whatsapp)] transition-all"
                        />
                        <button
                            onClick={handleCreateSession}
                            disabled={creating || !sessionName.trim()}
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white gradient-whatsapp hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {creating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <QrCode className="w-5 h-5" />
                                    Generar QR
                                </>
                            )}
                        </button>
                    </div>

                    {/* QR Code display */}
                    {qrCode && (
                        <div className="mt-6 flex flex-col items-center gap-4 p-8 rounded-2xl bg-dark-900/60 border border-dark-700/30 animate-fadeIn">
                            <div className="p-4 bg-white rounded-2xl shadow-2xl animate-pulse-glow">
                                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium">Escanea este código QR</p>
                                <p className="text-dark-400 text-sm mt-1">
                                    Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[var(--color-warning-500)]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Esperando escaneo...
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sessions list */}
            {loading ? (
                <div className="grid gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="p-6 rounded-2xl glass-light animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-dark-700" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-48 bg-dark-700 rounded" />
                                    <div className="h-3 w-32 bg-dark-700 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="text-center py-16 rounded-2xl glass-light animate-fadeIn">
                    <div className="w-16 h-16 rounded-2xl gradient-whatsapp/20 flex items-center justify-center mx-auto mb-4">
                        <Smartphone className="w-8 h-8 text-[var(--color-whatsapp)] opacity-50" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">
                        No tienes sesiones de WhatsApp
                    </h3>
                    <p className="text-dark-400 text-sm mb-6">
                        Crea una nueva sesión para conectar tu WhatsApp
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white gradient-whatsapp hover:opacity-90 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Crear Sesión
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {sessions.map((session, i) => {
                        const config = statusConfig[session.status] || statusConfig.DISCONNECTED;
                        const StatusIcon = config.icon;

                        return (
                            <div
                                key={session.id}
                                className="group p-5 rounded-2xl glass-light hover:bg-dark-800/60 transition-all animate-fadeIn"
                                style={{ animationDelay: `${i * 0.06}s` }}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `${config.color}15` }}
                                    >
                                        <StatusIcon className="w-6 h-6" style={{ color: config.color }} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-semibold text-white truncate">
                                                {session.sessionName}
                                            </h3>
                                            <span
                                                className="px-2.5 py-0.5 rounded-lg text-xs font-medium"
                                                style={{
                                                    backgroundColor: `${config.color}15`,
                                                    color: config.color,
                                                }}
                                            >
                                                {config.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-dark-500">
                                            {session.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    +{session.phone}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                {session._count?.messages || 0} mensajes
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDeleteSession(session.id)}
                                        className="p-2 rounded-lg text-dark-600 hover:text-danger-500 hover:bg-danger-500/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
