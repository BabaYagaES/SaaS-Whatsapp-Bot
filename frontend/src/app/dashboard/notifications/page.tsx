"use client";

import { useState } from "react";
import { Bell, CheckCircle2, MessageSquare, AlertCircle, Info, Trash2, Check, Clock } from "lucide-react";

export default function NotificationsPage() {
    // Mock notifications for now to show the premium design
    const [notifications, setNotifications] = useState([
        {
            id: '1',
            type: 'message',
            title: 'Nuevo mensaje recibido',
            message: 'Juan Pérez ha enviado un documento en el chat.',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
            read: false,
        },
        {
            id: '2',
            type: 'system',
            title: 'WhatsApp Conectado',
            message: 'Tu sesión de WhatsApp "Principal" se ha conectado exitosamente.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            read: true,
        },
        {
            id: '3',
            type: 'warning',
            title: 'Límite de mensajes próximo',
            message: 'Has consumido el 80% de los mensajes de tu plan mensual.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
            read: true,
        },
        {
            id: '4',
            type: 'automation',
            title: 'Automatización disparada',
            message: 'La automatización "Bienvenida" se envió a 5 nuevos contactos.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
            read: true,
        }
    ]);

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({...n, read: true})));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const markAsRead = (id: string) => {
        setNotifications(notifications.map(n => n.id === id ? {...n, read: true} : n));
    };

    const deleteNotification = (id: string) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const getTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 60) return `Hace ${minutes} min`;
        if (hours < 24) return `Hace ${hours} hr${hours > 1 ? 's' : ''}`;
        return `Hace ${days} día${days > 1 ? 's' : ''}`;
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'message': return <MessageSquare className="w-5 h-5 text-primary-400" />;
            case 'system': return <CheckCircle2 className="w-5 h-5 text-green-400" />;
            case 'warning': return <AlertCircle className="w-5 h-5 text-warning-400" />;
            case 'automation': return <BotIcon className="w-5 h-5 text-accent-400" />;
            default: return <Info className="w-5 h-5 text-blue-400" />;
        }
    };

    const getBgForType = (type: string) => {
        switch (type) {
            case 'message': return 'bg-primary-500/10 border-primary-500/20';
            case 'system': return 'bg-green-500/10 border-green-500/20';
            case 'warning': return 'bg-warning-500/10 border-warning-500/20';
            case 'automation': return 'bg-accent-500/10 border-accent-500/20';
            default: return 'bg-blue-500/10 border-blue-500/20';
        }
    };

    // Helper component since we can't import Bot easily inside the function
    const BotIcon = ({className}: {className: string}) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
    )

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 glass p-6 rounded-2xl border border-dark-700/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg shadow-primary-500/20 relative">
                            <Bell className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger-500 border border-dark-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm animate-pulse-glow">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                Centro de Notificaciones
                            </h1>
                            <p className="text-dark-400 mt-1 flex items-center gap-1.5 text-sm">
                                <Info className="w-4 h-4 opacity-70" />
                                Mantente al tanto de la actividad de tu cuenta
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <button
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors border border-dark-700/50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <Check className="w-4 h-4 group-hover:text-primary-400 transition-colors" />
                        Marcar leídas
                    </button>
                    <button
                        onClick={clearAll}
                        disabled={notifications.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 text-dark-300 hover:text-danger-400 hover:bg-danger-500/10 transition-colors border border-dark-700/50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <Trash2 className="w-4 h-4 group-hover:text-danger-400 transition-colors" />
                        Limpiar todo
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="bg-dark-900/60 backdrop-blur-md border border-dark-800 rounded-2xl overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                
                {notifications.length === 0 ? (
                    <div className="relative z-10 p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 rounded-full bg-dark-800/50 border border-dark-700/50 flex items-center justify-center mb-6">
                            <Bell className="w-10 h-10 text-dark-500 opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No tienes notificaciones</h3>
                        <p className="text-dark-400 max-w-sm">Aquí verás alertas sobre tus chats de WhatsApp, automatizaciones y estado del sistema.</p>
                    </div>
                ) : (
                    <div className="relative z-10 divide-y divide-dark-800/50">
                        {notifications.map((notification) => (
                            <div 
                                key={notification.id} 
                                className={`p-5 transition-all duration-300 hover:bg-dark-800/40 relative group ${!notification.read ? 'bg-primary-900/10' : ''}`}
                            >
                                {!notification.read && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 glow-primary rounded-r" />
                                )}
                                
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${getBgForType(notification.type)}`}>
                                        {getIconForType(notification.type)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3 mb-1">
                                            <h4 className={`text-base font-semibold truncate ${!notification.read ? 'text-white' : 'text-dark-200'}`}>
                                                {notification.title}
                                            </h4>
                                            <div className="flex items-center gap-1.5 text-xs text-dark-500 font-medium whitespace-nowrap shrink-0">
                                                <Clock className="w-3.5 h-3.5" />
                                                {getTimeAgo(notification.timestamp)}
                                            </div>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${!notification.read ? 'text-dark-200' : 'text-dark-400'}`}>
                                            {notification.message}
                                        </p>
                                        
                                        {/* Actions */}
                                        <div className="flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-200">
                                            {!notification.read && (
                                                <button 
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="text-xs font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1.5"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    Marcar leída
                                                </button>
                                            )}
                                            
                                            <button 
                                                    onClick={() => deleteNotification(notification.id)}
                                                    className="text-xs font-medium text-danger-400/70 hover:text-danger-400 flex items-center gap-1.5"
                                                >
                                                <Trash2 className="w-3 h-3" />
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
