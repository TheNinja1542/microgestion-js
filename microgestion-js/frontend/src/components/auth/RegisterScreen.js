import React from 'react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import FaceCapture from './FaceCapture';

// Roles disponibles al registrarse (tarjetas seleccionables).
const roles = [
    { value: 'admin', label: 'Administrador', icon: '⚡', desc: 'Acceso completo al sistema' },
    { value: 'vendedor', label: 'Vendedor', icon: '🛒', desc: 'Gestión de ventas y clientes' },
    { value: 'inventario', label: 'Inventario', icon: '📦', desc: 'Control de stock y productos' },
    { value: 'rrhh', label: 'Recursos Humanos', icon: '👥', desc: 'Gestión de personal' },
];
export default function RegisterScreen({ onGoLogin }) {
    const { register } = useAuth();

    // Campos del formulario.
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });

    const [role, setRole] = useState('');
    const [error, setError] = useState('');

    // Solo quedan 'form' y 'done'.
    const [step, setStep] = useState('form');

    const [showFace, setShowFace] = useState(false);

    // true si un administrador debe aprobar la cuenta antes de poder entrar.
    const [needsApproval, setNeedsApproval] = useState(false);

    const [loading, setLoading] = useState(false);

    // Al enviar el formulario del paso 'form'.
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        // Validaciones básicas
        if (!form.name || !form.email || !form.password || !role) {
            setError('Completa todos los campos');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (form.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        // Si los datos son válidos, solo se abre la cámara primero.
        setShowFace(true);
    }

    // Recibe el rostro capturado y crea la cuenta con el rostro incluido.
    async function crearCuentaConRostro(descriptor) {
        setShowFace(false);
        setLoading(true);

        // Ya no se revisa aquí si el rostro está repetido: el backend lo hace dentro
        // del registro y responde con ese error si el rostro ya existe en otra cuenta.

        const result = await register({
            name: form.name,
            email: form.email,
            password: form.password,
            role: role,
            faceDescriptor: Array.from(descriptor),
        });
        setLoading(false);
        if (!result.success) {
            setError(result.error || 'Error al registrar');
            return;
        }
        setNeedsApproval(!!result.needsApproval);
        setStep('done');
    }

    // Pantalla final: "¡Registro completado!"
    if (step === 'done') {
        return (React.createElement("div", { className: "min-h-screen bg-[#080d19] flex items-center justify-center p-4" },
            React.createElement("div", { className: "text-center animate-fade-up" },
                React.createElement("div", { className: "w-20 h-20 rounded-full bg-[#3b7eff]/20 border border-[#3b7eff]/40 flex items-center justify-center mx-auto mb-6" },
                    React.createElement("svg", { className: "w-10 h-10 text-[#3b7eff]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                        React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }))),
                React.createElement("h2", { className: "font-heading text-2xl font-bold text-white mb-2" }, "\u00A1Registro completado!"),
                React.createElement("p", { className: "text-slate-400 mb-6" }, needsApproval
                    ? "Tu cuenta y tu rostro fueron guardados. Un administrador debe aprobar tu acceso antes de que puedas iniciar sesión."
                    : "Tu cuenta y tu rostro fueron guardados exitosamente."),
                React.createElement("button", { onClick: onGoLogin, className: "px-6 py-2.5 rounded-lg bg-[#3b7eff] text-white font-medium hover:bg-[#5a94ff] transition-colors" }, "Iniciar sesi\u00F3n"))));
    }

    return (React.createElement("div", { className: "min-h-screen bg-[#080d19] flex items-center justify-center p-4" },
        showFace && (React.createElement(FaceCapture, { mode: "register", onDescriptor: crearCuentaConRostro, onSuccess: () => setShowFace(false), onCancel: () => setShowFace(false) })),
        React.createElement("div", { className: "w-full max-w-lg animate-fade-up" },
            React.createElement("div", { className: "mb-8 text-center" },
                React.createElement("div", { className: "inline-flex items-center gap-2 mb-4" },
                    React.createElement("div", { className: "w-9 h-9 rounded-lg bg-[#3b7eff] flex items-center justify-center" },
                        React.createElement("span", { className: "font-heading font-bold text-white text-sm" }, "MG")),
                    React.createElement("span", { className: "font-heading text-xl font-bold text-white" }, "MicroGesti\u00F3n")),
                React.createElement("h1", { className: "font-heading text-2xl font-bold text-white" }, "Crear cuenta"),
                React.createElement("p", { className: "text-slate-400 text-sm mt-1" }, "Completa tus datos para registrarte")),
            React.createElement("div", { className: "bg-[#0f1629] border border-[#1e2d4a] rounded-2xl p-6" },
                step === 'form' && (React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" },
                    React.createElement("div", null,
                        React.createElement("label", { className: "block text-xs font-medium text-slate-400 mb-1.5" }, "Nombre completo"),
                        React.createElement("input", { type: "text", value: form.name, onChange: e => setForm(p => ({ ...p, name: e.target.value })), placeholder: "Carlos Ram\u00EDrez", className: "w-full px-3.5 py-2.5 bg-[#080d19] border border-[#1e2d4a] rounded-lg text-white placeholder-slate-600 text-sm focus:outline-none focus:border-[#3b7eff] transition-colors" })),
                    React.createElement("div", null,
                        React.createElement("label", { className: "block text-xs font-medium text-slate-400 mb-1.5" }, "Correo electr\u00F3nico"),
                        React.createElement("input", { type: "email", value: form.email, onChange: e => setForm(p => ({ ...p, email: e.target.value })), placeholder: "correo@empresa.com", className: "w-full px-3.5 py-2.5 bg-[#080d19] border border-[#1e2d4a] rounded-lg text-white placeholder-slate-600 text-sm focus:outline-none focus:border-[#3b7eff] transition-colors" })),
                    React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                        React.createElement("div", null,
                            React.createElement("label", { className: "block text-xs font-medium text-slate-400 mb-1.5" }, "Contrase\u00F1a"),
                            React.createElement("input", { type: "password", value: form.password, onChange: e => setForm(p => ({ ...p, password: e.target.value })), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full px-3.5 py-2.5 bg-[#080d19] border border-[#1e2d4a] rounded-lg text-white placeholder-slate-600 text-sm focus:outline-none focus:border-[#3b7eff] transition-colors" })),
                        React.createElement("div", null,
                            React.createElement("label", { className: "block text-xs font-medium text-slate-400 mb-1.5" }, "Confirmar"),
                            React.createElement("input", { type: "password", value: form.confirmPassword, onChange: e => setForm(p => ({ ...p, confirmPassword: e.target.value })), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full px-3.5 py-2.5 bg-[#080d19] border border-[#1e2d4a] rounded-lg text-white placeholder-slate-600 text-sm focus:outline-none focus:border-[#3b7eff] transition-colors" }))),
                    React.createElement("div", null,
                        React.createElement("label", { className: "block text-xs font-medium text-slate-400 mb-2" }, "Cargo"),
                        React.createElement("div", { className: "grid grid-cols-2 gap-2" }, roles.map(r => (React.createElement("button", { key: r.value, type: "button", onClick: () => setRole(r.value), className: `text-left p-3 rounded-lg border transition-all ${role === r.value
                                ? 'border-[#3b7eff] bg-[#3b7eff]/10'
                                : 'border-[#1e2d4a] bg-[#080d19] hover:border-[#2a3d60]'}` },
                            React.createElement("div", { className: "text-base mb-0.5" }, r.icon),
                            React.createElement("div", { className: "text-xs font-medium text-white" }, r.label),
                            React.createElement("div", { className: "text-[10px] text-slate-500 leading-tight mt-0.5" }, r.desc)))))),
                    error && React.createElement("p", { className: "text-[#ef4444] text-xs bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-3 py-2" }, error),
                    React.createElement("button", { type: "submit", disabled: loading, className: "w-full py-3 rounded-lg bg-[#3b7eff] hover:bg-[#5a94ff] disabled:opacity-60 text-white font-medium transition-colors mt-2" }, loading ? 'Creando cuenta...' : 'Continuar y registrar rostro')))),
            React.createElement("p", { className: "text-center text-slate-500 text-sm mt-5" },
                "\u00BFYa tienes cuenta?",
                ' ',
                React.createElement("button", { onClick: onGoLogin, className: "text-[#3b7eff] hover:text-[#5a94ff] transition-colors font-medium" }, "Iniciar sesi\u00F3n")))));
}