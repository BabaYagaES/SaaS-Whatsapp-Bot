"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { MessageSquare, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const { setAuth } = useAuthStore();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await api.register(email, password, name);
            setAuth(res.user, res.token);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Error al crear cuenta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 gradient-mesh bg-dark-950">
            <div className="w-full max-w-md animate-fadeIn">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl gradient-whatsapp flex items-center justify-center shadow-lg shadow-[var(--color-whatsapp)]/20">
                            <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">
                            Whats<span className="text-[var(--color-whatsapp)]">Bot</span>
                        </span>
                    </Link>
                    <h1 className="text-2xl font-bold text-white mb-2">Crea tu cuenta</h1>
                    <p className="text-dark-400">Comienza a automatizar tu WhatsApp</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
                    {error && (
                        <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">Nombre</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                placeholder="Tu nombre"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white gradient-whatsapp hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-[var(--color-whatsapp)]/20"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Crear Cuenta
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-dark-400 text-sm">
                        ¿Ya tienes cuenta?{" "}
                        <Link
                            href="/login"
                            className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                        >
                            Inicia sesión
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
