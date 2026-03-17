"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
    Image as ImageIcon, 
    Plus, 
    Trash2, 
    X, 
    Loader2, 
    Search,
    FileText,
    Music,
    Copy,
    CheckCircle2
} from "lucide-react";

interface MediaItem {
    id: string;
    name: string;
    url: string;
    fileType: string;
    tags: string;
    createdAt: string;
}

export default function GalleryPage() {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        mediaBase64: "",
        mediaMimeType: "",
        tags: "",
        previewUrl: ""
    });

    const load = async () => {
        try {
            const r = await api.getMedia();
            setItems(r.media);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setForm({
                ...form,
                name: form.name || file.name,
                mediaBase64: base64.split(',')[1],
                mediaMimeType: file.type,
                previewUrl: base64
            });
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!form.name || !form.mediaBase64) return;
        setUploading(true);
        try {
            await api.uploadMedia({
                name: form.name,
                mediaBase64: form.mediaBase64,
                mediaMimeType: form.mediaMimeType,
                tags: form.tags
            });
            setForm({ name: "", mediaBase64: "", mediaMimeType: "", tags: "", previewUrl: "" });
            setShowUpload(false);
            load();
        } catch (e) {
            alert("Error al subir archivo");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este archivo de la galería?")) return;
        try {
            await api.deleteMedia(id);
            setItems(p => p.filter(i => i.id !== id));
        } catch (e) {
            alert("Error al eliminar");
        }
    };

    const copyUrl = (url: string, id: string) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredItems = items.filter(i => 
        i.name.toLowerCase().includes(search.toLowerCase()) || 
        i.tags.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <ImageIcon className="w-7 h-7 text-primary-500" /> Galería de Contenidos
                    </h1>
                    <p className="text-dark-400 text-sm mt-1">Sube imágenes, audios y documentos para que tu bot los use</p>
                </div>
                <button 
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-all shadow-lg shadow-primary-600/20"
                >
                    <Plus className="w-5 h-5" /> Subir Archivo
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input 
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o etiquetas..."
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-dark-900/50 border border-dark-800 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-all"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-square rounded-2xl bg-dark-800 animate-pulse" />
                    ))}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 rounded-3xl border-2 border-dashed border-dark-800">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 text-dark-700" />
                    <h3 className="text-lg font-medium text-dark-400">La galería está vacía</h3>
                    <p className="text-sm text-dark-500 mb-6">Empieza subiendo fotos de tus productos</p>
                    <button 
                        onClick={() => setShowUpload(true)}
                        className="px-6 py-2.5 rounded-xl bg-dark-800 text-white hover:bg-dark-700 transition-all"
                    >
                        Subir mi primera imagen
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredItems.map(item => (
                        <div key={item.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-dark-900 border border-dark-800 hover:border-primary-500/50 transition-all shadow-lg">
                            {item.fileType === 'image' ? (
                                <img src={item.url} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-dark-500">
                                    {item.fileType === 'audio' ? <Music className="w-10 h-10" /> : <FileText className="w-10 h-10" />}
                                    <span className="text-xs px-2 text-center truncate w-full">{item.name}</span>
                                </div>
                            )}
                            
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all p-4 flex flex-col justify-between">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => copyUrl(item.url, item.id)}
                                        className="p-2 rounded-lg bg-dark-800/80 text-white hover:bg-primary-500 transition-all"
                                        title="Copiar URL"
                                    >
                                        {copiedId === item.id ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 rounded-lg bg-danger-500/80 text-white hover:bg-danger-600 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-white font-bold text-sm truncate">{item.name}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {item.tags.split(',').filter(t => t.trim()).map((t, idx) => (
                                            <span key={idx} className="text-[10px] bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">
                                                {t.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {showUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden animate-zoomIn">
                        <div className="p-6 border-b border-dark-800 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Subir a Galería</h3>
                            <button onClick={() => setShowUpload(false)} className="text-dark-400 hover:text-white transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {!form.previewUrl ? (
                                <label className="w-full border-2 border-dashed border-dark-700 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all cursor-pointer group">
                                    <input type="file" onChange={handleFileChange} className="hidden" accept="image/*,application/pdf,audio/mpeg" />
                                    <div className="w-12 h-12 rounded-full bg-dark-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <ImageIcon className="w-6 h-6 text-dark-400 group-hover:text-primary-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white font-medium">Seleccionar archivo</p>
                                        <p className="text-xs text-dark-500 mt-1">JPG, PNG, PDF o MP3 (Máx 5MB)</p>
                                    </div>
                                </label>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-dark-800 border border-dark-700">
                                        {form.mediaMimeType.includes('image') ? (
                                            <img src={form.previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-dark-400">
                                                <FileText className="w-10 h-10" />
                                                <span className="text-sm">Archivo seleccionado</span>
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => setForm({...form, previewUrl: "", mediaBase64: ""})}
                                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-dark-900/80 text-white hover:bg-red-500 transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-dark-500 uppercase ml-1">Nombre</label>
                                            <input 
                                                value={form.name}
                                                onChange={e => setForm({...form, name: e.target.value})}
                                                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-white focus:border-primary-500 outline-none transition-all"
                                                placeholder="Ej: Foto Vestido Azul"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-dark-500 uppercase ml-1">Etiquetas (separadas por coma)</label>
                                            <input 
                                                value={form.tags}
                                                onChange={e => setForm({...form, tags: e.target.value})}
                                                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-white focus:border-primary-500 outline-none transition-all"
                                                placeholder="Ej: vestidos, azul, catálogo"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleUpload}
                                disabled={uploading || !form.name || !form.mediaBase64}
                                className="w-full py-4 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
                            >
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                                {uploading ? "Subiendo..." : "Guardar en Galería"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
