"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    Bot, Plus, Edit3, Trash2, ToggleLeft, ToggleRight,
    X, Loader2, Zap, ArrowRight, AlertCircle, Check, Crown
} from "lucide-react";

interface Automation {
    id: string;
    name: string;
    trigger: string;
    response: string;
    matchType: string;
    enabled: boolean;
    priority: number;
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
    });

    const [errorModal, setErrorModal] = useState<{message: string, isUpgrade: boolean} | null>(null);
    const [confirmModal, setConfirmModal] = useState<{id: string, message: string} | null>(null);

    const handleError = (e: any) => {
        const msg = e.message || "Ocurrió un error inesperado";
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
        setForm({ name: "", trigger: "", response: "", matchType: "CONTAINS", priority: 0 });
        setEditId(null); setShowForm(false);
    };

    const save = async () => {
        if (!form.name || !form.trigger || !form.response) return;
        setSaving(true);
        try {
            if (editId) await api.updateAutomation(editId, form);
            else await api.createAutomation(form);
            reset(); load();
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
        setForm({ name: a.name, trigger: a.trigger, response: a.response, matchType: a.matchType, priority: a.priority });
        setEditId(a.id); setShowForm(true);
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

                        {errorModal.isUpgrade && (
                            <div className="space-y-3 mb-6">
                                <div className="p-4 rounded-xl bg-dark-800 border border-primary-500/30 relative overflow-hidden group hover:border-primary-500 transition-all cursor-pointer">
                                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-primary-500 text-white text-[10px] font-bold rounded-bl-lg">
                                        RECOMENDADO
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-white">Plan Starter</h4>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-white">$10</span>
                                            <span className="text-xs text-dark-400">/mes</span>
                                        </div>
                                    </div>
                                    <ul className="text-xs text-dark-300 space-y-1">
                                        <li className="flex items-center gap-1"><Check className="w-3 h-3 text-primary-500" /> Hasta 10 automatizaciones</li>
                                        <li className="flex items-center gap-1"><Check className="w-3 h-3 text-primary-500" /> 1000 mensajes / mes</li>
                                    </ul>
                                </div>
                                
                                <div className="p-4 rounded-xl bg-dark-800 border border-dark-700 hover:border-primary-400 transition-all cursor-pointer">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-white">Plan Pro</h4>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-white">$29</span>
                                            <span className="text-xs text-dark-400">/mes</span>
                                        </div>
                                    </div>
                                    <ul className="text-xs text-dark-300 space-y-1">
                                        <li className="flex items-center gap-1"><Check className="w-3 h-3 text-primary-500" /> Automatizaciones ilimitadas</li>
                                        <li className="flex items-center gap-1"><Check className="w-3 h-3 text-primary-500" /> Mensajes ilimitados</li>
                                    </ul>
                                </div>
                            </div>
                        )}

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
                                    placeholder="Ej: precio"
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-all" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-1.5">Respuesta</label>
                            <textarea value={form.response} onChange={e => setForm({ ...form, response: e.target.value })}
                                placeholder="Ej: ¡Hola! Aquí tienes nuestro catálogo..." rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-all resize-none" />
                        </div>
                        <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-700/30">
                            <p className="text-xs text-dark-500 mb-2 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Vista previa</p>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="px-2 py-1 rounded-lg bg-dark-800 text-dark-400">{form.trigger || "trigger"}</span>
                                <ArrowRight className="w-4 h-4 text-dark-600" />
                                <span className="px-2 py-1 rounded-lg bg-primary-600/15 text-primary-300 truncate max-w-[300px]">
                                    {form.response || "respuesta"}
                                </span>
                            </div>
                        </div>
                        <button onClick={save} disabled={saving || !form.name || !form.trigger || !form.response}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            {editId ? "Actualizar" : "Crear"}
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
                <div className="space-y-3">
                    {items.map((a, i) => (
                        <div key={a.id} className={`group p-5 rounded-2xl glass-light hover:bg-dark-800/60 transition-all animate-fadeIn ${!a.enabled ? "opacity-60" : ""}`}
                            style={{ animationDelay: `${i * 0.05}s` }}>
                            <div className="flex items-start gap-4">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${a.enabled ? "bg-warning-500/15" : "bg-dark-700/50"}`}>
                                    <Zap className={`w-5 h-5 ${a.enabled ? "text-warning-500" : "text-dark-500"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-semibold text-white">{a.name}</h3>
                                        <span className="px-2 py-0.5 rounded-md bg-dark-700/60 text-xs text-dark-400">{matchLabels[a.matchType]}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-sm">
                                        <span className="px-2.5 py-1 rounded-lg bg-dark-800 text-dark-300 font-mono text-xs">&quot;{a.trigger}&quot;</span>
                                        <ArrowRight className="w-4 h-4 text-dark-600" />
                                        <span className="px-2.5 py-1 rounded-lg bg-primary-600/10 text-primary-300 text-xs truncate max-w-[300px]">{a.response}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => toggle(a.id)} className="p-1 rounded-lg transition-all">
                                        {a.enabled ? <ToggleRight className="w-8 h-8 text-[var(--color-whatsapp)]" /> : <ToggleLeft className="w-8 h-8 text-dark-600" />}
                                    </button>
                                    <button onClick={() => edit(a)} className="p-2 rounded-lg text-dark-600 hover:text-white hover:bg-dark-700 transition-all opacity-0 group-hover:opacity-100">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => promptDelete(a.id)} className="p-2 rounded-lg text-dark-600 hover:text-danger-500 hover:bg-danger-500/10 transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-4 h-4" />
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
