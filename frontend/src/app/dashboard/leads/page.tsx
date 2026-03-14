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
    ArrowUpRight,
    Loader2
} from "lucide-react";

interface Lead {
    id: string;
    contactName: string;
    contactPhone: string;
    source: string;
    status: string;
    notes: string;
    createdAt: string;
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
                                        <span className="text-dark-500">Cargando pedidos...</span>
                                    </td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-dark-800 flex items-center justify-center mx-auto mb-4">
                                            <FileText className="w-6 h-6 text-dark-600" />
                                        </div>
                                        <p className="text-white font-medium">No hay pedidos registrados</p>
                                        <p className="text-dark-500 text-xs mt-1">La IA registrará pedidos automáticamente cuando los detecte en el chat.</p>
                                    </td>
                                </tr>
                            ) : filteredLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-dark-800/40 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold border border-primary-500/20">
                                                {lead.contactName?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{lead.contactName || "Sin Nombre"}</p>
                                                <p className="text-xs text-dark-500 flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3" /> {lead.contactPhone}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-xs">
                                            <p className="text-dark-200 line-clamp-2">{lead.notes?.replace('Pedido detectado:', '').trim() || "Datos variados"}</p>
                                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-primary-500/10 text-[10px] text-primary-400 font-bold uppercase tracking-tighter">
                                                {lead.source}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-warning-500/10 text-warning-500 border border-warning-500/20 uppercase tracking-wider">
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col text-xs text-dark-400">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(lead.createdAt).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1 mt-1 text-dark-500"><Clock className="w-3 h-3" /> {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white border border-dark-700 transition-all opacity-0 group-hover:opacity-100">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
