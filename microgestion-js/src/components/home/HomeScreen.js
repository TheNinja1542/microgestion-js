import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeScreen() {
    const { user, logout } = useAuth();

    return (React.createElement("div", { className: "min-h-screen bg-[#080d19] flex flex-col" },
        React.createElement("header", { className: "h-14 border-b border-[#1e2d4a] flex items-center justify-between px-5 shrink-0" },
            React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("div", { className: "w-7 h-7 rounded-lg bg-[#3b7eff] flex items-center justify-center" },
                    React.createElement("span", { className: "font-heading font-bold text-white text-[10px]" }, "MG")),
                React.createElement("span", { className: "font-heading text-sm font-bold text-white" }, "MicroGesti\u00F3n")),
            React.createElement("div", { className: "flex items-center gap-3" },
                React.createElement("span", { className: "text-xs text-slate-400" }, user?.name || user?.email),
                React.createElement("button", { onClick: logout, className: "text-xs px-3 py-1.5 rounded-lg border border-[#1e2d4a] text-slate-400 hover:text-white hover:border-[#2a3d60] transition-colors" }, "Cerrar sesi\u00F3n"))),
        React.createElement("main", { className: "flex-1 flex items-center justify-center" },
            React.createElement("p", { className: "text-slate-600 text-sm" }, "Todav\u00EDa no hay nada aqu\u00ED."))));
}
