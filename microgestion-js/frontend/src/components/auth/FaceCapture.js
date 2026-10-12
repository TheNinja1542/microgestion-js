import React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../../contexts/AuthContext';

// Los modelos se cargan una sola vez y se reutilizan siempre.
let modelosCargados = false;
async function cargarModelos() {
  if (modelosCargados) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  ]);
  modelosCargados = true;
}

// CAMBIO: nueva prop onDescriptor. Si se pasa, el componente solo devuelve el rostro
// capturado y no lo guarda por su cuenta.
export default function FaceCapture({ mode, userId, onSuccess, onCancel, onDescriptor }) {
    const { loginWithFace, registerFace } = useAuth();

    // Referencia al <video> donde se muestra la cámara.
    const videoRef = useRef(null);

    // Estado del flujo: idle -> loading -> active -> scanning -> success | error.
    const [step, setStep] = useState('idle');
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(3);

    // Referencia al stream de la cámara, para poder apagarla después.
    const streamRef = useRef(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    // Si se cierra el modal con la cámara prendida, la apagamos.
    useEffect(() => {
        return () => stopStream();
    }, [stopStream]);

    // Pide permiso de cámara, carga los modelos y muestra el video.
    async function startCamera() {
        try {
            setError('');
            setStep('loading');
            await cargarModelos();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            });
            streamRef.current = stream;
            if (!videoRef.current) throw new Error('VIDEO_NO_ENCONTRADO');
            videoRef.current.srcObject = stream;
            await new Promise((resolve) => {
                const video = videoRef.current;
                if (video.readyState >= 2 && video.videoWidth > 0) {
                    resolve();
                    return;
                }
                video.onloadedmetadata = () => resolve();
            });
            await videoRef.current.play();
            setStep('active');
        } catch (err) {
            console.error('Error iniciando cámara:', err);
            stopStream();
            setStep('idle');
            setError('No se pudo acceder a la cámara o cargar los modelos. Revisa los permisos del navegador.');
        }
    }

    // Cuenta regresiva, detecta el rostro y lo registra o compara según el modo (register/login).
    async function captureAndProcess() {
        // CAMBIO: toda la función quedó dentro de try/catch para que no se quede en "escaneando"
        try {
            setStep('scanning');
            setError('');
            setCountdown(3);
            for (let i = 3; i >= 1; i--) {
                setCountdown(i);
                await new Promise((resolve) => setTimeout(resolve, 700));
            }

            // CAMBIO: antes era una sola detección. Ahora se toman 3 muestras...
            const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 });
            const muestras = [];
            for (let i = 0; i < 3; i++) {
                const d = await faceapi.detectSingleFace(videoRef.current, opciones).withFaceLandmarks().withFaceDescriptor();
                if (d) muestras.push(d.descriptor);
                await new Promise((resolve) => setTimeout(resolve, 250));
            }
            if (muestras.length === 0) {
                stopStream();
                setStep('error');
                setError('No se detectó ningún rostro. Acércate a la cámara y con buena luz, e intenta de nuevo.');
                return;
            }

            // CAMBIO: se promedian en un solo descriptor de 128 números (más estable)
            const descriptor = new Float32Array(128);
            for (const m of muestras) {
                for (let i = 0; i < 128; i++) descriptor[i] += m[i] / muestras.length;
            }

            // CAMBIO: si viene onDescriptor, solo se devuelve el rostro (el guardado lo hace el registro)
            if (onDescriptor) {
                stopStream();
                onDescriptor(descriptor);
                return;
            }

            const resultado =
                mode === 'register' ? await registerFace(userId, descriptor) : await loginWithFace(descriptor);
            stopStream();
            if (!resultado.success) {
                setStep('error');
                setError(resultado.error || 'Ocurrió un error procesando el rostro.');
                return;
            }
            setStep('success');
        } catch (err) {
            console.error('Error procesando rostro:', err);
            stopStream();
            setStep('error');
            setError('Ocurrió un error procesando el rostro. Intenta de nuevo.');
        }
    }

    // Interfaz: el modal con la cámara, los mensajes y los botones.
    return (
        React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" },
            React.createElement("div", { className: "w-full max-w-sm mx-4 rounded-2xl overflow-hidden border border-[#1e2d4a] bg-[#0f1629] animate-fade-up" },
                React.createElement("div", { className: "p-5 border-b border-[#1e2d4a] flex items-center justify-between" },
                    React.createElement("div", null,
                        React.createElement("h2", { className: "font-heading text-lg font-semibold text-white" }, mode === 'register' ? 'Registrar rostro' : 'Reconocimiento facial'),
                        React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, mode === 'register' ? 'Captura tu rostro para acceso rápido' : 'Mira hacia la cámara')),
                    React.createElement("button", { onClick: () => { stopStream(); onCancel(); }, className: "text-slate-400 hover:text-white transition-colors" },
                        React.createElement("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })))),
                React.createElement("div", { className: "p-5" },
                    React.createElement("div", { className: "relative bg-[#080d19] rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center" },
                        step === 'idle' && (React.createElement("div", { className: "flex flex-col items-center gap-3 text-slate-500" },
                            React.createElement("svg", { className: "w-12 h-12", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" }),
                                React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M15 13a3 3 0 11-6 0 3 3 0 016 0z" })),
                            React.createElement("p", { className: "text-sm" }, "Cámara inactiva"))),
                        step === 'loading' && (React.createElement("div", { className: "flex flex-col items-center gap-3 text-slate-500" },
                            React.createElement("div", { className: "w-8 h-8 border-2 border-[#3b7eff] border-t-transparent rounded-full animate-spin" }),
                            React.createElement("p", { className: "text-sm" }, "Cargando modelos..."))),
                        React.createElement("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, className: `w-full h-full object-cover ${step === 'idle' || step === 'loading' || step === 'success' || step === 'error' ? 'hidden' : ''}` }),
                        (step === 'active' || step === 'scanning') && (React.createElement(React.Fragment, null,
                            React.createElement("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none" },
                                React.createElement("div", { className: "w-40 h-44 relative" },
                                    React.createElement("div", { className: "absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#3b7eff] rounded-tl-lg" }),
                                    React.createElement("div", { className: "absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#3b7eff] rounded-tr-lg" }),
                                    React.createElement("div", { className: "absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#3b7eff] rounded-bl-lg" }),
                                    React.createElement("div", { className: "absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#3b7eff] rounded-br-lg" }))),
                            step === 'scanning' && (React.createElement("div", { className: "absolute left-1/2 -translate-x-1/2 w-40 h-0.5 bg-[#3b7eff]/60 scan-line pointer-events-none", style: { boxShadow: '0 0 8px #3b7eff' } })))),
                        step === 'scanning' && countdown > 0 && (React.createElement("div", { className: "absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white font-heading text-sm" },
                            "Escaneando... ", countdown)),
                        step === 'success' && (React.createElement("div", { className: "flex flex-col items-center gap-3 px-4 text-center" },
                            React.createElement("div", { className: "w-16 h-16 rounded-full bg-[#22c55e]/20 flex items-center justify-center" },
                                React.createElement("svg", { className: "w-8 h-8 text-[#22c55e]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4.5 12.75l6 6 9-13.5" }))),
                            React.createElement("p", { className: "text-[#22c55e] font-medium text-sm" }, mode === 'register' ? 'Rostro registrado' : 'Identidad verificada'))),
                        step === 'error' && (React.createElement("div", { className: "flex flex-col items-center gap-3" },
                            React.createElement("div", { className: "w-16 h-16 rounded-full bg-[#ef4444]/20 flex items-center justify-center" },
                                React.createElement("svg", { className: "w-8 h-8 text-[#ef4444]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2.5, d: "M6 18L18 6M6 6l12 12" }))),
                            React.createElement("p", { className: "text-[#ef4444] font-medium text-sm text-center px-4" }, error)))),
                    error && step !== 'error' && (React.createElement("p", { className: "text-[#ef4444] text-xs mt-3 text-center" }, error)),
                    React.createElement("div", { className: "mt-4 flex gap-3" },
                        step === 'idle' && (React.createElement("button", { onClick: startCamera, className: "flex-1 py-2.5 rounded-lg bg-[#3b7eff] hover:bg-[#5a94ff] text-white font-medium text-sm transition-colors" }, "Activar cámara")),
                        step === 'active' && (React.createElement("button", { onClick: captureAndProcess, className: "flex-1 py-2.5 rounded-lg bg-[#3b7eff] hover:bg-[#5a94ff] text-white font-medium text-sm transition-colors" }, mode === 'register' ? 'Capturar rostro' : 'Verificar identidad')),
                        step === 'success' && (React.createElement("button", { onClick: () => { stopStream(); onSuccess(); }, className: "flex-1 py-2.5 rounded-lg bg-[#3b7eff] hover:bg-[#5a94ff] text-white font-medium text-sm transition-colors" }, "Continuar")),
                        step === 'error' && (React.createElement("button", { onClick: () => { setStep('idle'); setError(''); }, className: "flex-1 py-2.5 rounded-lg bg-[#1e2d4a] hover:bg-[#243552] text-white font-medium text-sm transition-colors" }, "Reintentar")),
                        step !== 'success' && (React.createElement("button", { onClick: () => { stopStream(); onCancel(); }, className: "px-4 py-2.5 rounded-lg border border-[#1e2d4a] text-slate-400 hover:text-white text-sm transition-colors" }, "Cancelar")))))));
}