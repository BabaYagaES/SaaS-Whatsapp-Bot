"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    Users,
    Plus,
    Search,
    Phone,
    Tag,
    Edit3,
    Trash2,
    X,
    Loader2,
    MessageSquare,
    User,
} from "lucide-react";

interface Contact {
    id: string;
    phone: string;
    name: string | null;
    tags: string | string[];
    notes: string | null;
    createdAt: string;
    _count?: { messages: number };
}

const parseTags = (tags: string | string[]): string[] => {
    if (Array.isArray(tags)) return tags;
    try { return JSON.parse(tags); } catch { return []; }
};

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ phone: "", name: "", tags: "" });
    const [saving, setSaving] = useState(false);

    const loadContacts = async () => {
        try {
            const res = await api.getContacts({ search: search || undefined });
            setContacts(res.contacts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadContacts();
    }, [search]);

    const handleAdd = async () => {
        if (!formData.phone.trim()) return;
        setSaving(true);
        try {
            await api.createContact({
                phone: formData.phone,
                name: formData.name || undefined,
                tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : undefined,
            });
            setShowAdd(false);
            setFormData({ phone: "", name: "", tags: "" });
            loadContacts();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async (id: string) => {
        setSaving(true);
        try {
            await api.updateContact(id, {
                name: formData.name || undefined,
                tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : undefined,
            });
            setEditingId(null);
            setFormData({ phone: "", name: "", tags: "" });
            loadContacts();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este contacto?")) return;
        try {
            await api.deleteContact(id);
            setContacts((prev) => prev.filter((c) => c.id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const startEdit = (contact: Contact) => {
        setEditingId(contact.id);
        setFormData({
            phone: contact.phone,
            name: contact.name || "",
            tags: parseTags(contact.tags).join(", "),
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Users className="w-7 h-7 text-accent-500" />
                        Contactos
                    </h1>
                    <p className="text-dark-400 text-sm mt-1">
                        {contacts.length} contactos guardados
                    </p>
                </div>
                <button
                    onClick={() => {
                        setShowAdd(true);
                        setFormData({ phone: "", name: "", tags: "" });
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-all shadow-lg shadow-primary-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Agregar Contacto
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-dark-800/60 border border-dark-700/30 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50 transition-all"
                />
            </div>

            {/* Add form */}
            {showAdd && (
                <div className="p-6 rounded-2xl glass-light animate-fadeIn">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Nuevo Contacto</h3>
                        <button onClick={() => setShowAdd(false)} className="text-dark-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Teléfono (ej: 521234567890)"
                            className="px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-all"
                        />
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nombre"
                            className="px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-all"
                        />
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="Tags (separadas por coma)"
                            className="px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={saving || !formData.phone.trim()}
                        className="mt-3 flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Guardar
                    </button>
                </div>
            )}

            {/* Contacts grid */}
            {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-5 rounded-2xl glass-light animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-dark-700" />
                                <div className="space-y-2">
                                    <div className="h-3 w-24 bg-dark-700 rounded" />
                                    <div className="h-3 w-32 bg-dark-700 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : contacts.length === 0 ? (
                <div className="text-center py-16 rounded-2xl glass-light">
                    <Users className="w-14 h-14 mx-auto mb-4 text-dark-600 opacity-30" />
                    <h3 className="text-lg font-medium text-dark-400 mb-2">Sin contactos</h3>
                    <p className="text-sm text-dark-500">
                        Los contactos se crean automáticamente al recibir mensajes
                    </p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contacts.map((contact, i) => (
                        <div
                            key={contact.id}
                            className="group p-5 rounded-2xl glass-light hover:bg-dark-800/60 transition-all animate-fadeIn"
                            style={{ animationDelay: `${i * 0.04}s` }}
                        >
                            {editingId === contact.id ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Nombre"
                                        className="w-full px-3 py-2 rounded-lg bg-dark-900/60 border border-dark-700/50 text-sm text-white focus:outline-none focus:border-primary-500 transition-all"
                                    />
                                    <input
                                        type="text"
                                        value={formData.tags}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                        placeholder="Tags"
                                        className="w-full px-3 py-2 rounded-lg bg-dark-900/60 border border-dark-700/50 text-sm text-white focus:outline-none focus:border-primary-500 transition-all"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(contact.id)}
                                            disabled={saving}
                                            className="px-4 py-1.5 text-sm rounded-lg gradient-primary text-white hover:opacity-90 transition-all"
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="px-4 py-1.5 text-sm rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                {contact.name?.[0]?.toUpperCase() || (
                                                    <User className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">
                                                    {contact.name || "Sin nombre"}
                                                </p>
                                                <p className="text-sm text-dark-500 flex items-center gap-1">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {contact.phone}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(contact)}
                                                className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-white transition-all"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(contact.id)}
                                                className="p-1.5 rounded-lg hover:bg-danger-500/10 text-dark-500 hover:text-danger-500 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {parseTags(contact.tags).length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {parseTags(contact.tags).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-0.5 rounded-md bg-primary-600/15 text-primary-400 text-xs font-medium"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 text-xs text-dark-500">
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            {contact._count?.messages || 0} mensajes
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
