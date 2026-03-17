"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import {
  MessageSquare,
  Zap,
  Shield,
  ArrowRight,
  Smartphone,
  Bot,
  BarChart3,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-dark-950 gradient-mesh">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <Zap className="w-5 h-5 text-white fill-white/20" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">
              Zap<span className="text-green-400">py</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/login")}
              className="px-5 py-2.5 text-sm font-medium text-dark-300 hover:text-white transition-colors"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => router.push("/register")}
              className="px-5 py-2.5 text-sm font-semibold text-white gradient-whatsapp rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-[var(--color-whatsapp)]/20"
            >
              Empezar Gratis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800/60 border border-dark-700/50 text-sm text-dark-300 mb-8 animate-fadeIn">
            <Zap className="w-4 h-4 text-green-400" />
            Plataforma #1 de Automatización WhatsApp
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 animate-fadeIn stagger-1">
            Automatiza tu
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              WhatsApp Business
            </span>
          </h1>

          <p className="text-lg md:text-xl text-dark-400 max-w-2xl mx-auto mb-10 animate-fadeIn stagger-2">
            Conecta, gestiona y automatiza tus conversaciones de WhatsApp.
            Respuestas automáticas, gestión de contactos y más.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeIn stagger-3">
            <button
              onClick={() => router.push("/register")}
              className="group flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl hover:opacity-90 transition-all shadow-2xl shadow-green-600/25"
            >
              Comenzar Ahora
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 px-8 py-4 text-lg font-medium text-dark-300 glass rounded-2xl hover:bg-dark-800/80 transition-all"
            >
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Todo lo que necesitas
          </h2>
          <p className="text-center text-dark-400 mb-16 max-w-xl mx-auto">
            Herramientas poderosas para escalar tu comunicación por WhatsApp
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Smartphone,
                title: "Conexión WhatsApp",
                desc: "Conecta tu WhatsApp escaneando un código QR. Sin APIs complicadas.",
                color: "var(--color-whatsapp)",
              },
              {
                icon: Bot,
                title: "Respuestas Automáticas",
                desc: "Configura triggers por palabras clave y responde automáticamente.",
                color: "var(--color-primary-500)",
              },
              {
                icon: MessageSquare,
                title: "Chat en Tiempo Real",
                desc: "Ve y responde mensajes desde un panel web intuitivo.",
                color: "var(--color-accent-500)",
              },
              {
                icon: BarChart3,
                title: "Analíticas",
                desc: "Monitorea mensajes enviados, recibidos, y rendimiento de automatizaciones.",
                color: "var(--color-warning-500)",
              },
              {
                icon: Shield,
                title: "Seguridad",
                desc: "Tus datos protegidos con encriptación y autenticación JWT.",
                color: "var(--color-danger-500)",
              },
              {
                icon: Zap,
                title: "Escalable",
                desc: "Arquitectura SaaS lista para múltiples usuarios y sesiones.",
                color: "var(--color-primary-400)",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl glass-light hover:bg-dark-800/60 transition-all duration-300 hover:-translate-y-1 animate-fadeIn"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${feature.color}20` }}
                >
                  <feature.icon
                    className="w-6 h-6"
                    style={{ color: feature.color }}
                  />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-dark-400 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl glass-light relative overflow-hidden">
            <div className="absolute inset-0 gradient-mesh opacity-50" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                ¿Listo para automatizar?
              </h2>
              <p className="text-dark-400 mb-8 max-w-lg mx-auto">
                Crea tu cuenta gratis y conecta tu WhatsApp en menos de 2 minutos.
              </p>
              <button
                onClick={() => router.push("/register")}
                className="group inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white gradient-whatsapp rounded-2xl hover:opacity-90 transition-all shadow-2xl shadow-[var(--color-whatsapp)]/25"
              >
                Crear Cuenta Gratis
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-dark-800/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-dark-500">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-400" />
            <span>Zappy</span>
          </div>
          <p>© 2026 Todos los derechos reservados</p>
        </div>
      </footer>
    </div>
  );
}
