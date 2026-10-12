// Punto de entrada: aquí arranca React y se conecta con el
// <div id="root"> de index.html.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Estilos globales (Tailwind)

// Busca el <div id="root"> de index.html y monta ahí todo el árbol de componentes.
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode: no se ve en pantalla, solo ayuda a detectar errores en desarrollo 
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(App, null)
  )
);