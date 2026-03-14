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
    Paperclip,
    Image as ImageIcon,
    FileText,
    Mic,
    X,
    AlertTriangle as Warning,
    CheckCheck,
    Loader2,
    Zap
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
    mediaUrl?: string | null;
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
    const [fileToSend, setFileToSend] = useState<{name: string, type: string, base64: string} | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const [generatingAi, setGeneratingAi] = useState(false);

    const handleAiGenerate = async () => {
        if (!selectedContact) return;
        
        // Get the last user message to reply to
        const lastInbound = [...messages].reverse().find(m => m.direction === 'INBOUND');
        if (!lastInbound && !newMessage.trim()) return;

        setGeneratingAi(true);
        try {
            const prompt = newMessage.trim() || `Responder al mensaje: "${lastInbound?.body}"`;
            const res = await api.aiChat(prompt);
            setNewMessage(res.response);
        } catch (err) {
            console.error(err);
        } finally {
            setGeneratingAi(false);
        }
    };

    const handleSend = async () => {
        if ((!newMessage.trim() && !fileToSend) || !selectedContact || sessions.length === 0) return;
        setSending(true);
        setSendError(null);
        try {
            const res = await api.sendMessage(sessions[0].id, selectedContact.phone, newMessage, fileToSend);
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    body: newMessage,
                    direction: "OUTBOUND",
                    timestamp: new Date().toISOString(),
                    status: "SENT",
                    mediaUrl: res.data?.mediaUrl || null,
                },
            ]);
            setNewMessage("");
            setFileToSend(null);
        } catch (err: any) {
            console.error('[Send] Error:', err.message);
            setSendError(err.message || 'Error al enviar el mensaje');
            setTimeout(() => setSendError(null), 8000);
        } finally {
            setSending(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            setFileToSend({
                name: file.name,
                type: file.type,
                base64: base64String
            });
        };
        reader.readAsDataURL(file);
        
        // Reset input so the same file could be selected again if needed
        e.target.value = '';
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

    const renderMedia = (mediaUrl: string | null | undefined) => {
        if (!mediaUrl) return null;
        const lowerUrl = mediaUrl.toLowerCase();
        
        if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
            return (
                <div className="overflow-hidden rounded-xl border border-white/10 relative group bg-dark-900/50 flex items-center justify-center min-w-[240px] min-h-[160px] sm:min-w-[280px] sm:min-h-[200px]">
                    <ImageIcon className="w-8 h-8 opacity-20 absolute" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                        src={mediaUrl} 
                        alt="Media" 
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02] z-10" 
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity = '0';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                    <div className="hidden absolute inset-0 bg-dark-800/90 z-20 flex-col items-center justify-center text-dark-400 backdrop-blur-sm">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium px-4 text-center">Imagen no disponible<br />(404 Not Found)</span>
                    </div>
                </div>
            );
        }
        if (lowerUrl.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
            return (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-900/40 min-w-[240px] sm:min-w-[280px]">
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0">
                        <Mic className="w-5 h-5 text-primary-400" />
                    </div>
                    <audio controls src={mediaUrl} className="w-full h-9" />
                </div>
            );
        }
        return (
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-dark-900/40 hover:bg-dark-900/60 transition-colors border border-white/5 group min-w-[240px] sm:min-w-[280px]">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 group-hover:bg-primary-500/20 transition-colors">
                    <FileText className="w-5 h-5 text-primary-400" />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium text-white truncate group-hover:text-primary-300 transition-colors">Documento adjunto</span>
                    <span className="text-xs text-dark-400">Ver archivo</span>
                </div>
            </a>
        );
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
                className={`flex-1 flex flex-col relative bg-dark-900/40 ${selectedContact ? "flex" : "hidden sm:flex"
                    }`}
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                {selectedContact ? (
                    <div className="flex-1 flex flex-col relative z-10 w-full h-full"> 
                        {/* Chat header */}
                        <div className="h-[72px] flex items-center justify-between px-6 border-b border-dark-700/30 glass-light shrink-0">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedContact(null)}
                                    className="sm:hidden text-dark-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-dark-800 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-primary-500/20">
                                    {selectedContact.name?.[0]?.toUpperCase() || (
                                        <User className="w-6 h-6" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <p className="font-semibold text-white text-lg leading-tight">
                                        {selectedContact.name || selectedContact.phone}
                                    </p>
                                    <p className="text-sm text-primary-400 flex items-center gap-1.5 mt-0.5 font-medium">
                                        <Phone className="w-3.5 h-3.5" />
                                        {selectedContact.phone}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 scroll-smooth min-h-0">
                            {messages.map((msg, i) => {
                                const isOut = msg.direction === "OUTBOUND";
                                const showDate =
                                    i === 0 ||
                                    formatDate(messages[i - 1].timestamp) !== formatDate(msg.timestamp);

                                return (
                                    <div key={msg.id} className="flex flex-col">
                                        {showDate && (
                                            <div className="flex justify-center my-6">
                                                <span className="px-4 py-1.5 rounded-full bg-dark-800/90 text-xs font-medium text-dark-400 border border-dark-700/50 shadow-sm backdrop-blur-md text-center">
                                                    {formatDate(msg.timestamp)}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`flex w-full ${isOut ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`relative group max-w-[90%] sm:max-w-[75%] flex flex-col shadow-sm ${isOut
                                                    ? "bg-primary-600/90 text-white rounded-2xl rounded-tr-sm border border-primary-500/50"
                                                    : "bg-dark-800/95 text-dark-100 rounded-2xl rounded-tl-sm border border-dark-700/50"
                                                    }`}
                                            >
                                                {msg.mediaUrl && (
                                                    <div className="p-1.5 pb-0">
                                                        {renderMedia(msg.mediaUrl)}
                                                    </div>
                                                )}
                                                
                                                {msg.body && (
                                                    <div className={`px-4 py-3 ${msg.mediaUrl ? 'pt-2' : ''}`}>
                                                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                                                            {msg.body}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className={`flex items-center justify-end gap-1 px-3 pb-2 mt-auto ${!msg.body && msg.mediaUrl ? 'absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md z-30' : 'pt-1'}`}>
                                                    <p
                                                        className={`text-[11px] font-medium flex items-center gap-1.5 ${isOut ? "text-primary-100" : "text-dark-400"
                                                            } ${!msg.body && msg.mediaUrl ? 'text-white/95' : ''}`}
                                                    >
                                                        {formatTime(msg.timestamp)}
                                                        {isOut && <CheckCheck className={`w-3.5 h-3.5 ${(!msg.body && msg.mediaUrl) ? 'text-white/90' : 'opacity-80'}`} />}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message input */}
                        <div className="p-4 sm:p-5 bg-dark-900/80 backdrop-blur-md border-t border-dark-700/50 shrink-0">
                            {sendError && (
                                <div className="mb-4 px-4 py-3 rounded-xl bg-danger-500/10 border border-danger-500/30 flex items-start gap-3 animate-fadeIn">
                                    <span className="text-danger-400 text-sm shrink-0">⚠️</span>
                                    <div className="flex-1">
                                        <p className="text-sm text-danger-300">{sendError}</p>
                                        <a
                                            href="/dashboard/whatsapp"
                                            className="text-xs text-primary-400 hover:text-primary-300 underline mt-1.5 inline-block font-medium"
                                        >
                                            Ir a reconectar WhatsApp →
                                        </a>
                                    </div>
                                    <button
                                        onClick={() => setSendError(null)}
                                        className="text-danger-400/60 hover:text-danger-300 p-1 rounded-md transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            
                            <div className="flex items-end gap-3">
                                                
                                {fileToSend && (
                                    <div className="absolute bottom-[80px] left-5 right-5 p-3 rounded-xl bg-dark-800 border border-primary-500/30 shadow-lg flex items-center justify-between z-20">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center shrink-0">
                                                {fileToSend.type.includes('image') ? <ImageIcon className="w-5 h-5 text-primary-400" /> : <FileText className="w-5 h-5 text-primary-400" />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-white truncate">{fileToSend.name}</span>
                                                <span className="text-xs text-dark-400">Archivo adjunto listo</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setFileToSend(null)} className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileSelect}
                                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                                />
                                <button onClick={() => fileInputRef.current?.click()} title="Adjuntar archivo" className="p-3.5 shrink-0 rounded-xl bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700 transition-all shadow-sm border border-dark-700/50 group">
                                    <Paperclip className="w-5 h-5 group-hover:-rotate-45 transition-transform duration-300" />
                                </button>
                                
                                <div className="flex-1 relative rounded-xl bg-dark-800 border border-dark-700/50 focus-within:border-primary-500/50 focus-within:ring-1 focus-within:ring-primary-500/30 transition-all shadow-sm flex items-center">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Escribe un mensaje..."
                                        className="w-full bg-transparent px-4 py-3.5 pr-12 text-[15px] text-white placeholder-dark-500 focus:outline-none resize-none max-h-32 min-h-[52px]"
                                        rows={1}
                                        style={{ overflowY: newMessage.split('\n').length > 1 ? 'auto' : 'hidden' }}
                                    />
                                    <button 
                                        onClick={handleAiGenerate}
                                        title="Generar respuesta con IA"
                                        disabled={generatingAi}
                                        className="absolute right-2 p-2 rounded-lg text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                                    >
                                        {generatingAi ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                    </button>
                                </div>
                                
                                <button
                                    onClick={handleSend}
                                    disabled={sending || (!newMessage.trim() && !fileToSend && !sendError)}
                                    className="w-[52px] h-[52px] shrink-0 rounded-xl gradient-primary flex items-center justify-center text-white hover:opacity-90 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:shadow-none bg-primary-600 hover:bg-primary-500"
                                >
                                    {sending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5 ml-1" />
                                    )}
                                </button>
                            </div>
                            
                            {sessions.length === 0 && (
                                <p className="text-sm text-center text-danger-500 mt-3 font-medium flex items-center justify-center gap-1.5 animate-pulse">
                                    <Warning className="w-4 h-4" /> No tienes sesiones de WhatsApp conectadas
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center relative z-10 w-full h-full p-4">
                        <div className="text-center p-8 sm:p-10 rounded-3xl glass-light max-w-md w-full mx-auto shadow-xl border border-dark-700/30">
                            <div className="w-24 h-24 mx-auto rounded-[2rem] bg-gradient-to-br from-dark-800 to-dark-700 flex items-center justify-center mb-8 shadow-inner border border-dark-600/50 relative overflow-hidden">
                                <div className="absolute inset-0 bg-primary-500/10" />
                                <MessageSquare className="w-12 h-12 text-primary-500/80 relative z-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                                Tus Conversaciones
                            </h3>
                            <p className="text-dark-400 text-[16px] leading-relaxed mb-8">
                                Selecciona un chat de la lista lateral para visualizar el historial y comenzar a enviar mensajes, imágenes y documentos.
                            </p>
                            <div className="flex justify-center gap-4 text-dark-500">
                                <div className="flex flex-col items-center gap-2"><ImageIcon className="w-5 h-5 opacity-60" /></div>
                                <div className="flex flex-col items-center gap-2"><Mic className="w-5 h-5 opacity-60" /></div>
                                <div className="flex flex-col items-center gap-2"><FileText className="w-5 h-5 opacity-60" /></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
