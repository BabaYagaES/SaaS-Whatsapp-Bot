"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
    MessageSquare,
    Send,
    Search,
    Phone,
    ArrowLeft,
    User,
    Clock,
} from "lucide-react";

interface Conversation {
    contact: {
        id: string;
        phone: string;
        name: string | null;
        tags: string[];
    };
    lastMessage: {
        body: string;
        direction: string;
        timestamp: string;
    };
    totalMessages: number;
}

interface Message {
    id: string;
    body: string;
    direction: string;
    timestamp: string;
    status: string;
}

export default function ConversationsPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadConversations();
        loadSessions();

        const socket = getSocket();
        socket.on("whatsapp:message", ({ message }: any) => {
            if (selectedContact && message.contact?.id === selectedContact.id) {
                setMessages((prev) => [...prev, message]);
            }
            loadConversations();
        });

        return () => {
            socket.off("whatsapp:message");
        };
    }, [selectedContact]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadConversations = async () => {
        try {
            const res = await api.getConversations();
            setConversations(res.conversations);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadSessions = async () => {
        try {
            const res = await api.getSessions();
            setSessions(res.sessions.filter((s: any) => s.status === "CONNECTED"));
        } catch (err) {
            console.error(err);
        }
    };

    const openChat = async (contact: any) => {
        setSelectedContact(contact);
        try {
            const res = await api.getChat(contact.id);
            setMessages(res.messages);
        } catch (err) {
            console.error(err);
        }
    };

    const [sendError, setSendError] = useState<string | null>(null);

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedContact || sessions.length === 0) return;
        setSending(true);
        setSendError(null);
        try {
            await api.sendMessage(sessions[0].id, selectedContact.phone, newMessage);
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    body: newMessage,
                    direction: "OUTBOUND",
                    timestamp: new Date().toISOString(),
                    status: "SENT",
                },
            ]);
            setNewMessage("");
        } catch (err: any) {
            console.error('[Send] Error:', err.message);
            setSendError(err.message || 'Error al enviar el mensaje');
            // Auto-clear error after 8 seconds
            setTimeout(() => setSendError(null), 8000);
        } finally {
            setSending(false);
        }
    };

    const filteredConversations = conversations.filter(
        (c) =>
            !search ||
            c.contact.phone.includes(search) ||
            c.contact.name?.toLowerCase().includes(search.toLowerCase())
    );

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (ts: string) => {
        const d = new Date(ts);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return "Hoy";
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return "Ayer";
        return d.toLocaleDateString("es");
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex rounded-2xl overflow-hidden glass-light">
            {/* Conversations sidebar */}
            <div
                className={`w-full sm:w-80 lg:w-96 border-r border-dark-700/30 flex flex-col shrink-0 ${selectedContact ? "hidden sm:flex" : "flex"
                    }`}
            >
                <div className="p-4 border-b border-dark-700/30">
                    <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary-400" />
                        Conversaciones
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar conversación..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-800/60 border border-dark-700/30 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="space-y-1 p-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="p-3 rounded-xl animate-pulse flex gap-3">
                                    <div className="w-11 h-11 rounded-full bg-dark-700 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-24 bg-dark-700 rounded" />
                                        <div className="h-3 w-full bg-dark-700 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="text-center py-16 text-dark-500">
                            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No hay conversaciones</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-0.5">
                            {filteredConversations.map((conv) => (
                                <button
                                    key={conv.contact.id}
                                    onClick={() => openChat(conv.contact)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedContact?.id === conv.contact.id
                                        ? "bg-primary-600/15 border border-primary-500/20"
                                        : "hover:bg-dark-800/60"
                                        }`}
                                >
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                        {conv.contact.name?.[0]?.toUpperCase() || (
                                            <User className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-sm font-medium text-white truncate">
                                                {conv.contact.name || conv.contact.phone}
                                            </p>
                                            <span className="text-xs text-dark-500 shrink-0">
                                                {formatTime(conv.lastMessage.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-dark-400 truncate">
                                            {conv.lastMessage.direction === "OUTBOUND" && (
                                                <span className="text-dark-500">Tú: </span>
                                            )}
                                            {conv.lastMessage.body}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div
                className={`flex-1 flex flex-col ${selectedContact ? "flex" : "hidden sm:flex"
                    }`}
            >
                {selectedContact ? (
                    <>
                        {/* Chat header */}
                        <div className="h-16 flex items-center gap-3 px-4 border-b border-dark-700/30 shrink-0">
                            <button
                                onClick={() => setSelectedContact(null)}
                                className="sm:hidden text-dark-400 hover:text-white"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                                {selectedContact.name?.[0]?.toUpperCase() || (
                                    <User className="w-5 h-5" />
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-white">
                                    {selectedContact.name || selectedContact.phone}
                                </p>
                                <p className="text-xs text-dark-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {selectedContact.phone}
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {messages.map((msg, i) => {
                                const isOut = msg.direction === "OUTBOUND";
                                const showDate =
                                    i === 0 ||
                                    formatDate(messages[i - 1].timestamp) !== formatDate(msg.timestamp);

                                return (
                                    <div key={msg.id}>
                                        {showDate && (
                                            <div className="flex justify-center my-4">
                                                <span className="px-3 py-1 rounded-lg bg-dark-800/80 text-xs text-dark-500">
                                                    {formatDate(msg.timestamp)}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`flex ${isOut ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[75%] px-4 py-2.5 ${isOut
                                                    ? "chat-bubble-out bg-primary-600/20 border border-primary-500/20"
                                                    : "chat-bubble-in bg-dark-800/80 border border-dark-700/30"
                                                    }`}
                                            >
                                                <p className="text-sm text-dark-100 whitespace-pre-wrap break-words">
                                                    {msg.body}
                                                </p>
                                                <p
                                                    className={`text-[10px] mt-1 flex items-center gap-1 ${isOut ? "text-primary-400/50 justify-end" : "text-dark-600"
                                                        }`}
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(msg.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message input */}
                        <div className="p-4 border-t border-dark-700/30">
                            {sendError && (
                                <div className="mb-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                                    <span className="text-red-400 text-sm shrink-0">⚠️</span>
                                    <div className="flex-1">
                                        <p className="text-sm text-red-300">{sendError}</p>
                                        <a
                                            href="/dashboard/whatsapp"
                                            className="text-xs text-primary-400 hover:text-primary-300 underline mt-1 inline-block"
                                        >
                                            Ir a reconectar WhatsApp →
                                        </a>
                                    </div>
                                    <button
                                        onClick={() => setSendError(null)}
                                        className="text-red-400/60 hover:text-red-300 text-sm"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 px-4 py-3 rounded-xl bg-dark-800/60 border border-dark-700/30 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50 transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !newMessage.trim()}
                                    className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white hover:opacity-90 transition-all disabled:opacity-40 shrink-0"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                            {sessions.length === 0 && (
                                <p className="text-xs text-danger-500 mt-2">
                                    ⚠ No tienes sesiones de WhatsApp conectadas
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-dark-500">
                            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium text-dark-400">
                                Selecciona una conversación
                            </p>
                            <p className="text-sm mt-1">
                                Elige un chat de la lista para empezar
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
