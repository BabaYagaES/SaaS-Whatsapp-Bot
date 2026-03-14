"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { 
    Store, 
    MessageSquare, 
    Sparkles, 
    Check, 
    ArrowRight, 
    X,
    Loader2
} from "lucide-react";

export default function BusinessOnboarding({ onComplete }: { onComplete: () => void }) {
    const { user, setUser } = useAuthStore();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [businessName, setBusinessName] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [businessDescription, setBusinessDescription] = useState("");
    const [generatedTemplates, setGeneratedTemplates] = useState<{ name: string; content: string }[]>([]);

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const res = await api.updateProfile({
                businessName,
                businessType,
                businessDescription
            });
            setUser(res.user);
            
            // Step 1 success, try Step 2 (Templates)
            try {
                const templateRes = await api.generateTemplates({
                    businessName,
                    businessType,
                    businessDescription,
                    save: true
                });
                setGeneratedTemplates(templateRes.templates);
                setStep(2);
            } catch (tplErr: any) {
                console.error("AI Template Error:", tplErr);
                // If AI fails, we still proceed but without templates or with a warning
                alert("Perfil guardado, pero no pudimos generar plantillas con IA. Por favor verifica tu GROQ_API_KEY o GOOGLE_GEMINI_API_KEY en el backend.");
                onComplete(); // Finish onboarding anyway since profile is saved
            }
        } catch (err: any) {
            console.error("Profile Save Error:", err);
            alert("Error al guardar el perfil: " + (err.message || "Error desconocido"));
        } finally {
            setLoading(false);
        }
    };

    if (step === 1) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div className="w-full max-w-xl bg-dark-900 border border-dark-800 rounded-3xl overflow-hidden shadow-2xl animate-zoomIn">
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary-500/20 flex items-center justify-center text-primary-400">
                                <Store className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Configura tu Negocio</h2>
                                <p className="text-dark-400 text-sm">Personaliza tu experiencia con IA</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1.5 pl-1">Nombre del Negocio</label>
                                <input 
                                    type="text" 
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="Ej: Pizza Gourmet Roma"
                                    className="w-full bg-dark-800 border-dark-700 rounded-xl px-4 py-3 text-white placeholder-dark-600 focus:ring-2 focus:ring-primary-500/50 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1.5 pl-1">Tipo de Negocio</label>
                                <select 
                                    value={businessType}
                                    onChange={(e) => setBusinessType(e.target.value)}
                                    className="w-full bg-dark-800 border-dark-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all appearance-none"
                                >
                                    <option value="">Selecciona una categoría</option>
                                    <option value="Restaurante">Restaurante</option>
                                    <option value="Servicios Médicos">Servicios Médicos</option>
                                    <option value="Tienda Online">Tienda Online</option>
                                    <option value="Bienes Raíces">Bienes Raíces</option>
                                    <option value="Educación">Educación</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1.5 pl-1">Descripción corta</label>
                                <textarea 
                                    rows={3}
                                    value={businessDescription}
                                    onChange={(e) => setBusinessDescription(e.target.value)}
                                    placeholder="¿Qué hace tu negocio? (Ej: Vendemos pizzas artesanales con entrega a domicilio rápida)"
                                    className="w-full bg-dark-800 border-dark-700 rounded-xl px-4 py-3 text-white placeholder-dark-600 focus:ring-2 focus:ring-primary-500/50 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveProfile}
                            disabled={loading || !businessName || !businessType}
                            className="w-full mt-8 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-dark-700 disabled:text-dark-500 flex items-center justify-center gap-2 text-white font-bold transition-all shadow-lg shadow-primary-500/20"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Siguiente <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-dark-900 border border-dark-800 rounded-3xl overflow-hidden shadow-2xl animate-zoomIn">
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">¡IA Listas para Ti!</h2>
                            <p className="text-dark-400 text-sm">Hemos generado plantillas de WhatsApp para {businessName}</p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {generatedTemplates.map((tpl, i) => (
                            <div key={i} className="p-5 rounded-2xl bg-dark-800/50 border border-dark-700 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-primary-400">{tpl.name}</span>
                                    <Check className="w-4 h-4 text-green-400" />
                                </div>
                                <p className="text-sm text-dark-200 leading-relaxed italic">"{tpl.content}"</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3.5 rounded-xl bg-dark-800 text-white font-bold hover:bg-dark-700 transition-all border border-dark-700"
                        >
                            Ajustar Datos
                        </button>
                        <button
                            onClick={onComplete}
                            className="flex-2 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold transition-all shadow-lg shadow-primary-500/20 flex-[2]"
                        >
                            ¡Empezar ahora!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
