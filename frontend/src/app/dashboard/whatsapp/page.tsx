"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { connectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/store";
import type { LucideIcon } from "lucide-react";
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
    X,
} from "lucide-react";

interface Session {
    id: string;
    sessionName: string;
    status: string;
    phone: string | null;
    qrCode?: string | null;
    createdAt: string;
    _count?: { messages: number };
}

interface WhatsAppQrEvent {
    sessionId: string;
    qr: string;
}

interface WhatsAppReadyEvent {
    sessionId: string;
    phone: string | null;
}

interface WhatsAppDisconnectedEvent {
    sessionId: string;
}

function getErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : "Error inesperado";
}

export default function WhatsAppPage() {
    const { user } = useAuthStore();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [sessionName, setSessionName] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{id: string, message: string} | null>(null);

    const syncSessionStatus = useCallback(async (sessionId: string) => {
        try {
            const res = await api.getSession(sessionId);
            const session = res.session;
            if (!session) return;

            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? { ...s, ...session } : s))
            );

            if (session.status === "QR_READY" && session.qrCode) {
                setQrCode(session.qrCode);
                setActiveSessionId(sessionId);
                setShowCreate(true);
            }

            if (session.status === "CONNECTED") {
                setQrCode(null);
                setActiveSessionId((prev) => (prev === sessionId ? null : prev));
            }
        } catch (err) {
            console.error("[WhatsApp] syncSessionStatus error:", err);
        }
    }, []);

    const loadSessions = useCallback(async () => {
        try {
            const res = await api.getSessions();
            setSessions(res.sessions);

            // Keep QR visible after refresh if session is still waiting for scan.
            const pending = (res.sessions || []).find(
                (s: Session) => s.status === "QR_READY" && !!s.qrCode
            );
            if (pending) {
                setQrCode(pending.qrCode || null);
                setActiveSessionId(pending.id);
                setShowCreate(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();

        // Ensure this page is joined to the user room before listening for QR events.
        if (user?.id) {
            connectSocket(user.id);
        }

        const socket = getSocket();

        socket.on("whatsapp:qr", ({ sessionId, qr }: WhatsAppQrEvent) => {
            setQrCode(qr);
            setActiveSessionId(sessionId);
            setShowCreate(true);
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId ? { ...s, status: "QR_READY", qrCode: qr } : s
                )
            );
        });

        socket.on("whatsapp:ready", ({ sessionId, phone }: WhatsAppReadyEvent) => {
            setQrCode(null);
            setActiveSessionId(null);
            setShowCreate(false);
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId
                        ? { ...s, status: "CONNECTED", phone, qrCode: null }
                        : s
                )
            );
        });

        socket.on("connect_error", (err: unknown) => {
            console.error("[Socket] connect_error:", getErrorMessage(err));
        });

        socket.on("whatsapp:disconnected", ({ sessionId }: WhatsAppDisconnectedEvent) => {
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
            socket.off("connect_error");
        };
    }, [loadSessions, user?.id]);

    const handleCreateSession = async () => {
        if (!sessionName.trim()) return;
        setCreating(true);
        try {
            const res = await api.createSession(sessionName);
            setSessions((prev) => [res.session, ...prev]);
            setActiveSessionId(res.session.id);
            setShowCreate(true);
            setSessionName("");

            // Fallback in case websocket event is delayed/missed.
            setTimeout(() => {
                syncSessionStatus(res.session.id);
            }, 1200);
        } catch (err) {
            alert(getErrorMessage(err));
        } finally {
            setCreating(false);
        }
    };

    // Poll active session while waiting for QR/connection as fallback to socket events.
    useEffect(() => {
        if (!activeSessionId) return;

        const timer = setInterval(() => {
            syncSessionStatus(activeSessionId);
        }, 3000);

        return () => clearInterval(timer);
    }, [activeSessionId, syncSessionStatus]);

    const promptDelete = (id: string) => {
        setConfirmModal({ id, message: "¿Estás seguro de que deseas eliminar esta sesión? Esta acción no se puede deshacer." });
    };

    const confirmDelete = async () => {
        if (!confirmModal) return;
        const id = confirmModal.id;
        setConfirmModal(null);
        try {
            await api.deleteSession(id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
            if (activeSessionId === id) {
                setActiveSessionId(null);
                setQrCode(null);
            }
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
        CONNECTED: { label: "Conectado", color: "var(--color-whatsapp)", icon: Wifi },
        QR_READY: { label: "Escanea el QR", color: "var(--color-warning-500)", icon: QrCode },
        CONNECTING: { label: "Conectando...", color: "var(--color-primary-500)", icon: RefreshCw },
        DISCONNECTED: { label: "Desconectado", color: "var(--color-dark-500)", icon: WifiOff },
    };

    const renderConfirmModal = () => {
        if (!confirmModal) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-sm bg-dark-900 border border-dark-700/50 rounded-2xl shadow-2xl overflow-hidden relative">
                    <button 
                        onClick={() => setConfirmModal(null)}
                        className="absolute right-4 top-4 p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="p-6">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 rounded-full bg-danger-500/20 text-danger-500">
                                <Trash2 className="w-10 h-10" />
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-center text-white mb-2">
                            ¿Eliminar sesión?
                        </h3>
                        
                        <p className="text-dark-300 text-center text-sm mb-6">
                            {confirmModal.message}
                        </p>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmModal(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white bg-dark-800 hover:bg-dark-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white bg-danger-500 hover:bg-danger-600 transition-colors shadow-lg shadow-danger-500/20"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
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

                                    {session.status === "QR_READY" && session.qrCode && (
                                        <button
                                            onClick={() => {
                                                setQrCode(session.qrCode || null);
                                                setActiveSessionId(session.id);
                                                setShowCreate(true);
                                            }}
                                            className="p-2 rounded-lg text-dark-600 hover:text-primary-500 hover:bg-primary-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            title="Ver QR"
                                        >
                                            <QrCode className="w-5 h-5" />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => promptDelete(session.id)}
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
            {renderConfirmModal()}
        </div>
    );
}
