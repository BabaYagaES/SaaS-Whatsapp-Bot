"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
    BarChart3, 
    Calendar, 
    User, 
    Phone, 
    FileText, 
    Clock,
    Search,
    Filter,
    Trash2,
    CheckCircle,
    Loader2,
    Package,
    MapPin,
    ArrowUpRight,
} from "lucide-react";

interface OrderData {
    name?: string;
    product?: string;
    address?: string;
    total?: string;
}

interface Lead {
    id: string;
    contactName: string;
    contactPhone: string;
    source: string;
    status: string;
    notes: string;
    orderData?: OrderData | string;
    createdAt: string;
    updatedAt: string;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        try {
            const res = await api.getLeads();
            setLeads(res.leads);
        } catch (err) {
            console.error("Error loading leads:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este registro de pedido?")) return;
        try {
            await api.deleteLead(id);
            setLeads(prev => prev.filter(l => l.id !== id));
        } catch (err) {
            console.error("Error deleting lead:", err);
        }
    };

    const filteredLeads = leads.filter(l => 
        (l.contactName?.toLowerCase() || "").includes(search.toLowerCase()) ||
        l.contactPhone.includes(search) ||
        (l.notes?.toLowerCase() || "").includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <BarChart3 className="w-7 h-7 text-primary-400" /> Pedidos Detectados por IA
                    </h1>
                    <p className="text-dark-400 text-sm mt-1">Reporte automático de clientes interesados y pedidos agendados</p>
                </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl glass-light border border-dark-800">
                    <p className="text-xs text-dark-500 font-medium uppercase tracking-wider mb-1">Total Pedidos</p>
                    <p className="text-3xl font-bold text-white leading-none">{leads.length}</p>
                </div>
                <div className="p-5 rounded-2xl glass-light border border-dark-800">
                    <p className="text-xs text-dark-500 font-medium uppercase tracking-wider mb-1">Nuevos (Hoy)</p>
                    <p className="text-3xl font-bold text-primary-400 leading-none">
                        {leads.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}
                    </p>
                </div>
                <div className="p-5 rounded-2xl glass-light border border-dark-800">
                    <p className="text-xs text-dark-500 font-medium uppercase tracking-wider mb-1">Conversión IA</p>
                    <p className="text-3xl font-bold text-accent-400 leading-none">Alta</p>
                </div>
            </div>

            <div className="glass-light rounded-2xl overflow-hidden border border-dark-800">
                <div className="p-4 border-b border-dark-800 bg-dark-900/40 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                        <input 
                            type="text"
                            placeholder="Buscar por cliente, teléfono o pedido..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-xl bg-dark-800 text-dark-400 hover:text-white border border-dark-700">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-dark-900/60 text-dark-400 font-medium uppercase text-[10px] tracking-widest border-b border-dark-800">
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Información del Pedido</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2" />
                                        <span className="text-dark-500 font-medium">Cargando pedidos...</span>
                                    </td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-dark-800/50 flex items-center justify-center mx-auto mb-4 border border-dark-700/30">
                                            <FileText className="w-6 h-6 text-dark-500" />
                                        </div>
                                        <p className="text-white font-medium">No hay pedidos registrados</p>
                                        <p className="text-dark-500 text-xs mt-1">La IA registrará pedidos automáticamente cuando los detecte.</p>
                                    </td>
                                </tr>
                            ) : (() => {
                                // Deduplicate repeated consecutive records from the same contact for the view
                                let lastKey = "";
                                return filteredLeads.map((lead, idx) => {
                                    let d: OrderData = {};
                                    if (lead.orderData) {
                                        try {
                                            d = typeof lead.orderData === 'string' ? JSON.parse(lead.orderData) : lead.orderData;
                                        } catch (e) {}
                                    } else if (lead.notes?.includes('{')) {
                                        try {
                                            const jsonStr = lead.notes.substring(lead.notes.indexOf('{'));
                                            d = JSON.parse(jsonStr);
                                        } catch (e) {}
                                    }
                                    
                                    // Use contact + product/notes as key for deduplication
                                    const currentKey = `${lead.contactPhone}-${d.product || lead.notes}`;
                                    const isDuplicate = currentKey === lastKey;
                                    lastKey = currentKey;

                                    if (isDuplicate) return null;

                                    return (
                                        <tr key={lead.id} className="hover:bg-dark-800/30 transition-colors group">
                                            <td className="px-6 py-6 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600/20 to-accent-600/20 flex items-center justify-center text-primary-400 font-bold border border-primary-500/20">
                                                        {lead.contactName?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-base tracking-tight">{lead.contactName || "Sin Nombre"}</p>
                                                        <p className="text-xs text-dark-500 flex items-center gap-1.5 mt-0.5 font-medium">
                                                            <Phone className="w-3.5 h-3.5" /> {lead.contactPhone}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 font-semibold">
                                                <div className="max-w-xs space-y-2">
                                                    {d.product || d.address || d.total ? (
                                                        <div className="space-y-2 py-1">
                                                            {d.product && (
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center border border-primary-500/10">
                                                                        <Package className="w-4 h-4 text-primary-400" />
                                                                    </div>
                                                                    <span className="text-white font-semibold text-sm">{d.product}</span>
                                                                </div>
                                                            )}
                                                            {d.address && (
                                                                <div className="flex gap-2.5 bg-dark-800/40 p-2.5 rounded-xl border border-dark-700/30">
                                                                    <MapPin className="w-4 h-4 text-accent-400 mt-0.5 shrink-0" /> 
                                                                    <span className="text-dark-200 text-xs leading-relaxed">{d.address}</span>
                                                                </div>
                                                            )}
                                                            {d.total && (
                                                                <div className="flex items-center gap-2 mt-1 px-1">
                                                                    <CheckCircle className="w-3.5 h-3.5 text-accent-500" />
                                                                    <span className="text-xs font-bold text-accent-400 uppercase tracking-wider">Total: {d.total}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-dark-400 text-xs italic bg-dark-800/20 p-2 rounded-lg">{lead.notes?.replace('Pedido detectado:', '').trim()}</p>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/10 text-[9px] text-primary-400 font-black uppercase tracking-widest border border-primary-500/10">
                                                            {lead.source}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 align-top">
                                                <span className="px-3 py-1 rounded-lg text-[10px] font-black bg-warning-500/10 text-warning-400 border border-warning-500/20 uppercase tracking-widest">
                                                    {lead.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 align-top">
                                                <div className="flex flex-col text-xs text-dark-400 font-medium">
                                                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-dark-500" /> {new Date(lead.createdAt).toLocaleDateString()}</span>
                                                    <span className="flex items-center gap-1.5 mt-1.5 text-dark-500 font-normal"><Clock className="w-3.5 h-3.5 opacity-50" /> {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-right align-top">
                                                <div className="flex items-center justify-end gap-2 text-dark font-semibold">
                                                    <button 
                                                        onClick={() => handleDelete(lead.id)}
                                                        className="p-2.5 rounded-xl bg-dark-800/50 text-dark-500 hover:text-danger-400 hover:bg-danger-500/10 border border-dark-700/30 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Eliminar registro"
                                                    >
                                                        <Trash2 className="w-4.5 h-4.5" />
                                                    </button>
                                                    <button className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 hover:text-white hover:bg-primary-500 border border-primary-500/10 transition-all opacity-0 group-hover:opacity-100">
                                                        <ArrowUpRight className="w-4.5 h-4.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
