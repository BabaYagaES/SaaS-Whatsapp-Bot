"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
    Settings, User, Save, Loader2, Shield, CreditCard,
    Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Zap, Sparkles
} from "lucide-react";

export default function SettingsPage() {
    const { user, setUser } = useAuthStore();
    const [name, setName] = useState(user?.name || "");
    const [businessName, setBusinessName] = useState(user?.businessName || "");
    const [businessType, setBusinessType] = useState(user?.businessType || "");
    const [businessDescription, setBusinessDescription] = useState(user?.businessDescription || "");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiSuccess, setAiSuccess] = useState(false);

    // Password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);
    const [pwSuccess, setPwSuccess] = useState(false);
    const [pwError, setPwError] = useState("");

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        try {
            const res = await api.updateProfile({ 
                name, 
                businessName, 
                businessType, 
                businessDescription 
            });
            setUser(res.user);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateAi = async () => {
        if (!businessName || !businessType) {
            alert("Por favor completa el nombre y tipo de negocio antes de generar.");
            return;
        }
        setAiGenerating(true);
        setAiSuccess(false);
        try {
            await api.generateTemplates({
                businessName,
                businessType,
                businessDescription,
                save: true
            });
            setAiSuccess(true);
            setTimeout(() => setAiSuccess(false), 3000);
            alert("¡IA activada! Hemos generado y guardado 3 nuevas automatizaciones inteligentes basadas en tu perfil.");
        } catch (err: any) {
            alert("Error con la IA: " + err.message);
        } finally {
            setAiGenerating(false);
        }
    };

    const handlePasswordChange = async () => {
        setPwError("");
        setPwSuccess(false);

        if (newPassword.length < 6) {
            setPwError("La nueva contraseña debe tener al menos 6 caracteres");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwError("Las contraseñas no coinciden");
            return;
        }

        setPwSaving(true);
        try {
            await api.changePassword(currentPassword, newPassword);
            setPwSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setTimeout(() => setPwSuccess(false), 5000);
        } catch (err: any) {
            setPwError(err.message);
        } finally {
            setPwSaving(false);
        }
    };

    const plans = [
        {
            name: "FREE", price: "$0",
            features: ["1 sesión WhatsApp", "100 mensajes/mes", "3 automatizaciones", "50 contactos"],
            current: user?.plan === "FREE",
        },
        {
            name: "STARTER", price: "$19",
            features: ["3 sesiones", "1,000 mensajes/mes", "10 automatizaciones", "500 contactos"],
            current: user?.plan === "STARTER",
            popular: true,
        },
        {
            name: "PRO", price: "$49",
            features: ["10 sesiones", "Mensajes ilimitados", "Automatizaciones ilimitadas", "Contactos ilimitados"],
            current: user?.plan === "PRO",
        },
        {
            name: "ENTERPRISE", price: "$149",
            features: ["Sesiones ilimitadas", "Mensajes ilimitados", "Soporte prioritario", "API personalizada"],
            current: user?.plan === "ENTERPRISE",
        },
    ];

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Settings className="w-7 h-7 text-dark-400" />
                    Configuración
                </h1>
                <p className="text-dark-400 text-sm mt-1">Gestiona tu cuenta, seguridad y plan</p>
            </div>

            {/* Profile */}
            <div className="p-6 rounded-2xl glass-light animate-fadeIn">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary-400" />
                    Perfil
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">Nombre</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white focus:outline-none focus:border-primary-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
                        <input
                            value={user?.email || ""}
                            disabled
                            className="w-full px-4 py-3 rounded-xl bg-dark-800/40 border border-dark-700/30 text-dark-400 cursor-not-allowed"
                        />
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">Nombre del Negocio</label>
                        <input
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white focus:outline-none focus:border-primary-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">Tipo de Negocio</label>
                        <input
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white focus:outline-none focus:border-primary-500 transition-all"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Descripción del Negocio</label>
                    <textarea
                        value={businessDescription}
                        onChange={(e) => setBusinessDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white focus:outline-none focus:border-primary-500 transition-all resize-none"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-6">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Perfil
                    </button>

                    <button
                        onClick={handleGenerateAi}
                        disabled={aiGenerating || saving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-warning-600/20 border border-warning-500/30 hover:bg-warning-500/30 transition-all disabled:opacity-50"
                    >
                        {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin text-warning-500" /> : <Zap className="w-4 h-4 text-warning-500" />}
                        <span className="text-warning-500">Auto-Generar Automatizaciones</span>
                    </button>

                    {success && (
                        <span className="text-sm text-[var(--color-whatsapp)] animate-fadeIn flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Guardado
                        </span>
                    )}

                    {aiSuccess && (
                        <span className="text-sm text-warning-400 animate-fadeIn flex items-center gap-1 font-medium">
                            <Sparkles className="w-4 h-4" /> IA Actualizada
                        </span>
                    )}
                </div>
            </div>

            {/* Change Password */}
            <div className="p-6 rounded-2xl glass-light animate-fadeIn stagger-1">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-accent-500" />
                    Cambiar Contraseña
                </h2>
                <div className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">Contraseña actual</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white focus:outline-none focus:border-primary-500 transition-all pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                            >
                                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">Nueva contraseña</label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white focus:outline-none focus:border-primary-500 transition-all pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                            >
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {newPassword.length > 0 && newPassword.length < 6 && (
                            <p className="text-xs text-danger-500 mt-1">Mínimo 6 caracteres</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">Confirmar nueva contraseña</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite la contraseña"
                            className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white focus:outline-none focus:border-primary-500 transition-all"
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-danger-500 mt-1">Las contraseñas no coinciden</p>
                        )}
                    </div>

                    {pwError && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-sm animate-fadeIn">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {pwError}
                        </div>
                    )}

                    {pwSuccess && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-whatsapp)]/10 border border-[var(--color-whatsapp)]/20 text-[var(--color-whatsapp)] text-sm animate-fadeIn">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            ¡Contraseña actualizada correctamente!
                        </div>
                    )}

                    <button
                        onClick={handlePasswordChange}
                        disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-accent-600 hover:bg-accent-500 transition-all disabled:opacity-40"
                    >
                        {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Cambiar Contraseña
                    </button>
                </div>
            </div>

            {/* Plans */}
            <div className="animate-fadeIn stagger-2">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-warning-500" />
                    Planes
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`p-5 rounded-2xl transition-all relative ${plan.current
                                ? "glass border-2 border-primary-500/30 shadow-lg shadow-primary-500/10"
                                : "glass-light hover:bg-dark-800/60"
                                }`}
                        >
                            {plan.popular && (
                                <span className="absolute -top-2.5 right-3 bg-[var(--color-whatsapp)] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                    Popular
                                </span>
                            )}
                            <p className="text-sm font-medium text-dark-400 mb-1">{plan.name}</p>
                            <p className="text-2xl font-bold text-white mb-3">
                                {plan.price}
                                <span className="text-sm text-dark-500 font-normal">/mes</span>
                            </p>
                            <ul className="space-y-2 text-sm text-dark-400">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2">
                                        <span className="text-[var(--color-whatsapp)]">✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            {plan.current ? (
                                <p className="mt-3 text-xs text-primary-400 font-medium">✅ Plan actual</p>
                            ) : (
                                <button className="mt-3 w-full py-2 rounded-lg text-xs font-medium text-dark-400 border border-dark-700/40 hover:border-primary-500/40 hover:text-white transition-all">
                                    Próximamente
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Security Info */}
            <div className="p-6 rounded-2xl glass-light animate-fadeIn stagger-3">
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-accent-500" />
                    Seguridad
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-800/30">
                        <CheckCircle className="w-4 h-4 text-[var(--color-whatsapp)] mt-0.5 shrink-0" />
                        <div>
                            <p className="text-dark-200 font-medium">Contraseña encriptada</p>
                            <p className="text-dark-500 text-xs">bcrypt con 12 salt rounds</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-800/30">
                        <CheckCircle className="w-4 h-4 text-[var(--color-whatsapp)] mt-0.5 shrink-0" />
                        <div>
                            <p className="text-dark-200 font-medium">Token JWT</p>
                            <p className="text-dark-500 text-xs">Sesión segura con expiración de 7 días</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-800/30">
                        <CheckCircle className="w-4 h-4 text-[var(--color-whatsapp)] mt-0.5 shrink-0" />
                        <div>
                            <p className="text-dark-200 font-medium">Rate Limiting</p>
                            <p className="text-dark-500 text-xs">100 req/min general, 10/15min auth</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-800/30">
                        <CheckCircle className="w-4 h-4 text-[var(--color-whatsapp)] mt-0.5 shrink-0" />
                        <div>
                            <p className="text-dark-200 font-medium">Headers protegidos</p>
                            <p className="text-dark-500 text-xs">Helmet + CORS configurado</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
