// PANTALLA PRINCIPAL 
// Se muestra depues de inicair sesion 
// La pantalla principal es muy simple por ahora, solo muestra el nombre del usuario y un boton para cerrar sesion en la parte derecha superior, y un mensaje en el centro de la pantalla que dice "Todavía no hay nada aquí.".

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeScreen({ onVerUsuarios }) {
    const { user, logout } = useAuth();

    return (React.createElement("div", { className: "min-h-screen bg-[#080d19] flex flex-col" },
        React.createElement("header", { className: "h-14 border-b border-[#1e2d4a] flex items-center justify-between px-5 shrink-0" },
            React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("div", { className: "w-7 h-7 rounded-lg bg-[#3b7eff] flex items-center justify-center" },
                    React.createElement("span", { className: "font-heading font-bold text-white text-[10px]" }, "MG")),
                React.createElement("span", { className: "font-heading text-sm font-bold text-white" }, "MicroGesti\u00F3n")),
            React.createElement("div", { className: "flex items-center gap-3" },
                 onVerUsuarios && user?.role === 'admin' && React.createElement("button", { onClick: onVerUsuarios, className: "text-xs px-3 py-1.5 rounded-lg bg-[#3b7eff] text-white hover:bg-[#5a94ff] transition-colors" }, "Usuarios"),
                React.createElement("span", { className: "text-xs text-slate-400" }, user?.name || user?.email),
                React.createElement("button", { onClick: logout, className: "text-xs px-3 py-1.5 rounded-lg border border-[#1e2d4a] text-slate-400 hover:text-white hover:border-[#2a3d60] transition-colors" }, "Cerrar sesi\u00F3n"))),
        React.createElement("main", { className: "flex-1 flex items-center justify-center" },
            React.createElement("p", { className: "text-slate-600 text-sm" }, "Todav\u00EDa no hay nada aqu\u00ED."))));
}
