"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    Bot, Plus, Edit3, Trash2, ToggleLeft, ToggleRight,
    X, Loader2, Zap, ArrowRight, AlertCircle, Check, Crown,
    Image as ImageIcon, Paperclip, FileText, Music
} from "lucide-react";

interface Automation {
    id: string;
    name: string;
    trigger: string;
    response: string;
    matchType: string;
    enabled: boolean;
    priority: number;
    isAi: boolean;
    mediaUrl?: string;
}

const matchLabels: Record<string, string> = {
    EXACT: "Exacto", CONTAINS: "Contiene",
    STARTS_WITH: "Empieza con", REGEX: "Regex",
};

export default function AutomationsPage() {
    const [items, setItems] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: "", trigger: "", response: "",
        matchType: "CONTAINS", priority: 0,
        isAi: false,
        mediaUrl: "",
        mediaBase64: "",
        mediaName: "",
        mediaMimeType: "",
    });

    const [errorModal, setErrorModal] = useState<{message: string, isUpgrade: boolean} | null>(null);
    const [confirmModal, setConfirmModal] = useState<{id: string, message: string} | null>(null);

    const handleError = (e: any) => {
        const msg = e.response?.data?.error?.message || e.message || "Ocurrió un error inesperado";
        setErrorModal({
            message: msg,
            isUpgrade: msg.toLowerCase().includes("upgrade") || msg.toLowerCase().includes("límite")
        });
    };

    const load = async () => {
        try {
            const r = await api.getAutomations();
            setItems(r.automations);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const reset = () => {
        setForm({ 
            name: "", trigger: "", response: "", 
            matchType: "CONTAINS", priority: 0, isAi: false,
            mediaUrl: "", mediaBase64: "", mediaName: "", mediaMimeType: ""
        });
        setEditId(null); 
        setShowForm(false);
    };

    const save = async () => {
        if (!form.name || !form.trigger) return;
        setSaving(true);
        try {
            if (editId) await api.updateAutomation(editId, form);
            else await api.createAutomation(form);
            reset(); 
            load();
        } catch (e: any) { handleError(e); }
        finally { setSaving(false); }
    };

    const toggle = async (id: string) => {
        try {
            const r = await api.toggleAutomation(id);
            setItems(p => p.map(a => a.id === id ? { ...a, enabled: r.automation.enabled } : a));
        } catch (e: any) { handleError(e); }
    };

    const promptDelete = (id: string) => {
        setConfirmModal({ id, message: "¿Estás seguro de que deseas eliminar esta automatización? Esta acción no se puede deshacer." });
    };

    const confirmDelete = async () => {
        if (!confirmModal) return;
        const id = confirmModal.id;
        setConfirmModal(null);
        try { 
            await api.deleteAutomation(id); 
            setItems(p => p.filter(a => a.id !== id)); 
        }
        catch (e: any) { handleError(e); }
    };

    const edit = (a: Automation) => {
        setForm({ 
            name: a.name, trigger: a.trigger, response: a.response, 
            matchType: a.matchType, priority: a.priority, isAi: a.isAi,
            mediaUrl: a.mediaUrl || "", mediaBase64: "", mediaName: "", mediaMimeType: ""
        });
        setEditId(a.id); 
        setShowForm(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setForm({
                ...form,
                mediaBase64: base64.split(',')[1],
                mediaName: file.name,
                mediaMimeType: file.type,
                mediaUrl: base64 // Preview only
            });
        };
        reader.readAsDataURL(file);
    };

    const removeFile = () => {
        setForm({
            ...form,
            mediaUrl: "",
            mediaBase64: "",
            mediaName: "",
            mediaMimeType: ""
        });
    };

    const renderErrorModal = () => {
        if (!errorModal) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-md bg-dark-900 border border-dark-700/50 rounded-2xl shadow-2xl overflow-hidden relative">
                    <button 
                        onClick={() => setErrorModal(null)}
                        className="absolute right-4 top-4 p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="p-6">
                        <div className="flex justify-center mb-4">
                            <div className={`p-4 rounded-full ${errorModal.isUpgrade ? 'bg-primary-500/20 text-primary-500' : 'bg-warning-500/20 text-warning-500'}`}>
                                {errorModal.isUpgrade ? <Crown className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-center text-white mb-2">
                            {errorModal.isUpgrade ? "Límite Alcanzado" : "Ocurrió un error"}
                        </h3>
                        
                        <p className="text-dark-300 text-center text-sm mb-6">
                            {errorModal.message}
                        </p>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setErrorModal(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white bg-dark-800 hover:bg-dark-700 transition-colors"
                            >
                                {errorModal.isUpgrade ? "Cerrar" : "Aceptar"}
                            </button>
                            {errorModal.isUpgrade && (
                                <button
                                    onClick={() => setErrorModal(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-all inline-flex justify-center items-center gap-2"
                                >
                                    <Crown className="w-4 h-4" /> Upgrade
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
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
                            ¿Eliminar automatización?
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Bot className="w-7 h-7 text-warning-500" /> Automatizaciones
                    </h1>
                    <p className="text-dark-400 text-sm mt-1">Respuestas automáticas por palabras clave</p>
                </div>
                <button onClick={() => { reset(); setShowForm(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-all shadow-lg shadow-primary-600/20">
                    <Plus className="w-5 h-5" /> Nueva Automatización
                </button>
            </div>

            {showForm && (
                <div className="p-6 rounded-2xl glass-light animate-fadeIn">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-semibold text-white">{editId ? "Editar" : "Nueva"} Automatización</h3>
                        <button onClick={reset} className="text-dark-500 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-1.5">Nombre</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Ej: Enviar catálogo"
                                className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-all" />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1.5">Tipo</label>
                                <select value={form.matchType} onChange={e => setForm({ ...form, matchType: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white focus:outline-none focus:border-primary-500 transition-all">
                                    <option value="CONTAINS">Contiene</option>
                                    <option value="EXACT">Exacto</option>
                                    <option value="STARTS_WITH">Empieza con</option>
                                    <option value="REGEX">Regex</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1.5">Trigger</label>
                                <input value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })}
                                    placeholder="Ej: precio, cuanto cuesta, valor"
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-all" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-1.5">Respuesta {form.isAi && "(Base / Contexto)"}</label>
                            <textarea value={form.response} onChange={e => setForm({ ...form, response: e.target.value })}
                                placeholder={form.isAi ? "Ej: Saluda cordialmente y ofrece el menú..." : "Ej: ¡Hola! Aquí tienes nuestro catálogo..."} rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-all resize-none" />
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-dark-300 mb-1.5">Archivo / Imagen Adjunta</label>
                            {form.mediaUrl ? (
                                <div className="relative group w-full aspect-video rounded-xl overflow-hidden border border-dark-700 bg-dark-900 flex items-center justify-center">
                                    {(form.mediaMimeType?.includes('image') || form.mediaUrl.startsWith('data:image')) ? (
                                        <img src={form.mediaUrl} alt="Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-dark-400">
                                            <Paperclip className="w-10 h-10" />
                                            <span className="text-xs">{form.mediaName || "Archivo adjunto"}</span>
                                        </div>
                                    )}
                                    <button 
                                        onClick={removeFile}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-600 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-4">
                                    <label className="flex-1 border-2 border-dashed border-dark-700 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all cursor-pointer group">
                                        <input type="file" onChange={handleFileChange} className="hidden" accept="image/*,application/pdf,audio/mpeg" />
                                        <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <ImageIcon className="w-5 h-5 text-dark-400 group-hover:text-primary-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-white">Subir archivo</p>
                                            <p className="text-xs text-dark-500">Imagen, PDF o Audio</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
                            <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-primary-400" /> Modo IA Inteligente
                                </h4>
                                <p className="text-xs text-dark-400 mt-0.5">La respuesta será generada dinámicamente usando tu perfil de negocio.</p>
                            </div>
                            <button 
                                onClick={() => setForm({ ...form, isAi: !form.isAi })}
                                className="transition-all"
                            >
                                {form.isAi ? <ToggleRight className="w-9 h-9 text-primary-500 shrink-0" /> : <ToggleLeft className="w-9 h-9 text-dark-600 shrink-0" />}
                            </button>
                        </div>

                        <button onClick={save} disabled={saving || !form.name || !form.trigger}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            {editId ? "Actualizar Automatización" : "Crear Automatización"}
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-5 rounded-2xl glass-light animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-dark-700" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-40 bg-dark-700 rounded" />
                                    <div className="h-3 w-64 bg-dark-700 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 rounded-2xl glass-light">
                    <Bot className="w-14 h-14 mx-auto mb-4 text-dark-600 opacity-30" />
                    <h3 className="text-lg font-medium text-dark-400 mb-2">Sin automatizaciones</h3>
                    <p className="text-sm text-dark-500 mb-6">Crea tu primera automatización</p>
                    <button onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-all">
                        <Plus className="w-5 h-5" /> Crear Automatización
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((a, i) => (
                        <div key={a.id} className={`group p-5 rounded-2xl glass-light hover:bg-dark-800/60 border border-transparent hover:border-dark-700/50 transition-all animate-fadeIn ${!a.enabled ? "opacity-60" : ""}`}
                            style={{ animationDelay: `${i * 0.05}s` }}>
                            <div className="flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.enabled ? "bg-warning-500/15" : "bg-dark-700/50"}`}>
                                            <Zap className={`w-5 h-5 ${a.enabled ? "text-warning-500" : "text-dark-500"}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white leading-tight">{a.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-1.5 py-0.5 rounded bg-dark-700/60 text-[10px] text-dark-400 uppercase font-medium">{matchLabels[a.matchType]}</span>
                                                {a.isAi && (
                                                    <span className="px-1.5 py-0.5 rounded bg-primary-500/20 text-[10px] font-bold text-primary-400 flex items-center gap-1 border border-primary-500/20 uppercase tracking-wider">
                                                        <Zap className="w-2 h-2" /> IA
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => edit(a)} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-800 transition-all">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => promptDelete(a.id)} className="p-2 rounded-lg text-dark-500 hover:text-danger-500 hover:bg-danger-500/10 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 flex-1">
                                    <div className="text-xs">
                                        <p className="text-dark-500 mb-1 flex items-center gap-1 uppercase tracking-tighter font-bold">Si el mensaje:</p>
                                        <div className="px-3 py-2 rounded-xl bg-dark-900/60 border border-dark-800 text-dark-300 font-medium">
                                            {a.trigger}
                                        </div>
                                    </div>

                                    <div className="text-xs">
                                        <p className="text-dark-500 mb-1 flex items-center gap-1 uppercase tracking-tighter font-bold">Enviar:</p>
                                        <div className="px-3 py-2 rounded-xl bg-primary-500/5 border border-primary-500/10 text-primary-300 whitespace-pre-wrap">
                                            {a.response || "No response text"}
                                        </div>
                                    </div>

                                    {a.mediaUrl && (
                                        <div className="mt-2 rounded-xl overflow-hidden border border-dark-800 bg-dark-900/40 aspect-[2/1] relative group/media">
                                            {a.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) || a.mediaUrl.includes('image') ? (
                                                <img src={a.mediaUrl} alt="Attached" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-dark-500">
                                                    {a.mediaUrl.match(/\.(mp3|wav|ogg)/i) ? <Music className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                                    <span className="text-[10px]">Archivo Adjunto</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-dark-800/50 flex items-center justify-between">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${a.enabled ? "text-[var(--color-whatsapp)]" : "text-dark-500"}`}>
                                        {a.enabled ? "Activa" : "Inactiva"}
                                    </span>
                                    <button onClick={() => toggle(a.id)} className="transition-all">
                                        {a.enabled ? <ToggleRight className="w-8 h-8 text-[var(--color-whatsapp)]" /> : <ToggleLeft className="w-8 h-8 text-dark-600" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {renderErrorModal()}
            {renderConfirmModal()}
        </div>
    );
}
