'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePortalConfig, displayName } from '@/components/PortalConfigProvider';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ─── Types ──────────────────────────────────────────────────────

type Step =
  | 'greeting'
  | 'gestion'
  | 'zona'
  | 'presupuesto'
  | 'tipo'
  | 'nombre'
  | 'email'
  | 'telefono'
  | 'sending'
  | 'done'
  | 'error';

interface Msg { from: 'bot' | 'user'; text: string; id: number }

interface Lead {
  intent?: string;
  gestion?: string;
  zona?: string;
  presupuesto_max?: number;
  tipo?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
}

// ─── Presupuesto ranges ─────────────────────────────────────────

const PRESUPUESTO_OPTS = [
  { label: 'Menos de Q500,000',       value: 500_000 },
  { label: 'Q500,000 — Q1,000,000',   value: 1_000_000 },
  { label: 'Q1,000,000 — Q3,000,000', value: 3_000_000 },
  { label: 'Más de Q3,000,000',        value: 0 },
  { label: 'No lo tengo claro',        value: 0 },
];

const TIPO_OPTS = ['🏠 Casa', '🏢 Apartamento', '🌿 Terreno', '🏬 Local / Oficina', '🏗 Otro'];

// ─── Dot typing indicator ───────────────────────────────────────

function TypingDots() {
  return (
    <div className="chatbot-msg bot">
      <div className="chatbot-typing-dots">
        <span /><span /><span />
      </div>
    </div>
  );
}

// ─── Main widget ─────────────────────────────────────────────────

let _id = 0;
function mkMsg(from: 'bot' | 'user', text: string): Msg {
  return { from, text, id: ++_id };
}

export default function ChatbotWidget() {
  const cfg     = usePortalConfig();
  const company = displayName(cfg);
  const [open, setOpen]     = useState(false);
  const [badge, setBadge]   = useState(true);
  const [msgs, setMsgs]     = useState<Msg[]>([]);
  const [step, setStep]     = useState<Step>('greeting');
  const [lead, setLead]     = useState<Lead>({});
  const [input, setInput]   = useState('');
  const [typing, setTyping] = useState(false);
  const [optDisabled, setOptDisabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  // Focus input when step changes to a text input step
  useEffect(() => {
    if (['zona', 'nombre', 'email', 'telefono'].includes(step)) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step]);

  const addBot = useCallback((text: string) => {
    setMsgs(m => [...m, mkMsg('bot', text)]);
  }, []);

  const addUser = useCallback((text: string) => {
    setMsgs(m => [...m, mkMsg('user', text)]);
  }, []);

  const botSay = useCallback((text: string, delay = 700) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addBot(text);
    }, delay);
  }, [addBot]);

  // Open: show greeting
  const handleOpen = () => {
    setBadge(false);
    setOpen(true);
    if (msgs.length === 0) {
      setTimeout(() => {
        addBot(cfg.chatbot_mensaje_bienvenida ?? `¡Hola! 👋 Soy el asistente de ${company}. ¿En qué te puedo ayudar hoy?`);
      }, 300);
    }
  };

  // ── Option handlers ──────────────────────────────────────────

  const pickIntent = (label: string, intent: string) => {
    if (optDisabled) return;
    setOptDisabled(true);
    addUser(label);
    setLead(l => ({ ...l, intent }));

    if (intent === 'buscar') {
      setStep('gestion');
      botSay('¿Estás buscando para comprar o rentar?');
    } else if (intent === 'precios') {
      setStep('tipo');
      botSay('¿Qué tipo de propiedad te interesa?');
    } else {
      setStep('nombre');
      botSay('Con gusto te comunico con un agente. ¿Cuál es tu nombre?');
    }
  };

  const pickGestion = (label: string, gestion: string) => {
    if (optDisabled) return;
    setOptDisabled(true);
    addUser(label);
    setLead(l => ({ ...l, gestion }));
    setStep('zona');
    botSay('¿En qué zona, municipio o departamento te interesa buscar?');
  };

  const pickPresupuesto = (label: string, value: number) => {
    if (optDisabled) return;
    setOptDisabled(true);
    addUser(label);
    setLead(l => ({ ...l, presupuesto_max: value || undefined }));
    setStep('nombre');
    botSay('Perfecto. Para enviarte información personalizada, ¿cuál es tu nombre?');
  };

  const pickTipo = (label: string) => {
    if (optDisabled) return;
    setOptDisabled(true);
    addUser(label);
    setLead(l => ({ ...l, tipo: label.replace(/^[^\w]*/, '').trim() }));
    setStep('nombre');
    botSay('Entendido. ¿Cuál es tu nombre?');
  };

  // ── Text input submission ────────────────────────────────────

  const submitInput = () => {
    const val = input.trim();
    if (!val) return;
    setInput('');

    addUser(val);

    if (step === 'zona') {
      setLead(l => ({ ...l, zona: val }));
      setStep('presupuesto');
      botSay('¿Cuál es tu presupuesto aproximado?');
    } else if (step === 'nombre') {
      setLead(l => ({ ...l, nombre: val }));
      setStep('email');
      botSay(`Mucho gusto, ${val}. ¿Cuál es tu correo electrónico?`);
    } else if (step === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        botSay('Por favor ingresa un correo válido.');
        return;
      }
      setLead(l => ({ ...l, email: val }));
      setStep('telefono');
      botSay('¿Y tu número de teléfono? (puedes omitirlo)');
    } else if (step === 'telefono') {
      setLead(l => ({ ...l, telefono: val }));
      submitLead({ ...lead, telefono: val });
    }
  };

  const skipTelefono = () => {
    addUser('Omitir');
    submitLead(lead);
  };

  // ── Final submission ─────────────────────────────────────────

  const submitLead = async (finalLead: Lead) => {
    if (!finalLead.nombre) return;
    setStep('sending');
    setTyping(true);

    const body: Record<string, unknown> = { nombre: finalLead.nombre };
    if (finalLead.email)          body.email           = finalLead.email;
    if (finalLead.telefono)       body.telefono        = finalLead.telefono;
    if (finalLead.gestion)        body.gestion_interes = finalLead.gestion;
    if (finalLead.zona)           body.zona_interes    = finalLead.zona;
    if (finalLead.presupuesto_max) body.presupuesto_max = finalLead.presupuesto_max;
    if (finalLead.tipo)           body.tipo_propiedad  = finalLead.tipo;

    try {
      await fetch(`${API}/api/public/chatbot-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setTyping(false);
      setStep('done');
      addBot(`✅ ¡Listo, ${finalLead.nombre}! Un agente se pondrá en contacto contigo pronto. ¡Gracias por tu interés!`);
    } catch {
      setTyping(false);
      setStep('error');
      addBot('Hubo un problema al enviar tu información. Por favor intenta de nuevo o contáctanos directamente.');
    }
  };

  // ── Options rendered per step ────────────────────────────────

  const renderOptions = () => {
    if (optDisabled || typing) return null;

    if (step === 'greeting' && msgs.length > 0) {
      return (
        <div className="chatbot-options">
          <button className="chatbot-opt" onClick={() => pickIntent('🏠 Buscar propiedad', 'buscar')}>🏠 Buscar propiedad</button>
          <button className="chatbot-opt" onClick={() => pickIntent('💰 Consultar precios', 'precios')}>💰 Consultar precios</button>
          <button className="chatbot-opt" onClick={() => pickIntent('👤 Hablar con un agente', 'agente')}>👤 Hablar con un agente</button>
        </div>
      );
    }
    if (step === 'gestion') {
      return (
        <div className="chatbot-options">
          <button className="chatbot-opt" onClick={() => pickGestion('🔑 Comprar', 'VENTA')}>🔑 Comprar</button>
          <button className="chatbot-opt" onClick={() => pickGestion('📋 Rentar', 'RENTA')}>📋 Rentar</button>
          <button className="chatbot-opt" onClick={() => pickGestion('Comprar o Rentar', 'AMBAS')}>Comprar o Rentar</button>
        </div>
      );
    }
    if (step === 'presupuesto') {
      return (
        <div className="chatbot-options">
          {PRESUPUESTO_OPTS.map((o) => (
            <button key={o.label} className="chatbot-opt" onClick={() => pickPresupuesto(o.label, o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      );
    }
    if (step === 'tipo') {
      return (
        <div className="chatbot-options">
          {TIPO_OPTS.map((t) => (
            <button key={t} className="chatbot-opt" onClick={() => pickTipo(t)}>{t}</button>
          ))}
        </div>
      );
    }
    return null;
  };

  // ── Input area ───────────────────────────────────────────────

  const showInput = ['zona', 'nombre', 'email', 'telefono'].includes(step) && !typing;

  const inputPlaceholder: Record<string, string> = {
    zona:     'Ej: Zona 14, Mixco, Antigua…',
    nombre:   'Tu nombre completo',
    email:    'tu@email.com',
    telefono: 'Ej: 5555-5555',
  };

  const inputType: Record<string, string> = {
    email: 'email', telefono: 'tel',
  };

  return (
    <>
      {/* Floating button */}
      <button className="chatbot-btn" onClick={handleOpen} aria-label="Abrir chat de asistencia" title="Chatea con nosotros">
        {open ? '✕' : '💬'}
        {badge && !open && <span className="chatbot-badge">1</span>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="Asistente virtual">
          {/* Header */}
          <div className="chatbot-head">
            <div className="chatbot-head-info">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <h4>Asistente Virtual</h4>
                <p>{company}</p>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Cerrar chat">✕</button>
          </div>

          {/* Messages */}
          <div className="chatbot-msgs" role="log" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`chatbot-msg ${m.from}`}>
                <div className="chatbot-bubble">{m.text}</div>
              </div>
            ))}
            {typing && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* Options */}
          {renderOptions()}

          {/* Text input */}
          {showInput && (
            <div className="chatbot-input-area">
              <input
                ref={inputRef}
                className="chatbot-input"
                type={inputType[step] || 'text'}
                placeholder={inputPlaceholder[step] || ''}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitInput(); }}
                autoComplete={step === 'email' ? 'email' : step === 'telefono' ? 'tel' : 'name'}
              />
              {step === 'telefono' && (
                <button className="chatbot-skip" onClick={skipTelefono} title="Omitir teléfono">Omitir</button>
              )}
              <button
                className="chatbot-send"
                onClick={submitInput}
                disabled={!input.trim()}
                aria-label="Enviar"
              >›</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
