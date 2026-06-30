/**
 * Plantilla HTML por defecto para la Carta de Compromiso de Comisión.
 * Usa sintaxis Handlebars: {{variable}} para texto plano, {{{variable}}} para HTML crudo.
 *
 * Variables disponibles al renderizar:
 *   empresa_nombre, logo_src (data-URI o vacío), tagline,
 *   color_primario, color_oscuro, on_primario,
 *   ref_num, fecha,
 *   propietario_nombre, agente_nombre, agente_email,
 *   gestion_texto, codigo_propiedad, titulo_propiedad, tipo_inmueble,
 *   gestion, ubicacion, direccion,
 *   precio_referencia, comision_pct, iva_pct_display,
 *   es_venta, es_renta, es_ambas,
 *   (venta) venta_precio, venta_comision_base, venta_iva_monto, venta_comision_total,
 *   (renta) renta_precio, renta_esc_a_neta, renta_esc_a_iva, renta_esc_a_total,
 *   {{{clausulas_custom}}}
 */
export const CARTA_TEMPLATE_DEFAULT = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: letter; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      background: #fff;
      width: 8.5in;
      min-height: 11in;
      position: relative;
      font-size: 9pt;
      color: #1e293b;
    }
    .sidebar {
      position: fixed; left: 0; top: 0;
      width: 5px; height: 100%;
      background: {{color_primario}};
    }
    .top-bar {
      position: fixed; left: 5px; top: 0;
      right: 0; height: 3px;
      background: {{color_primario}};
    }
    .content {
      margin-left: 50px;
      margin-right: 42px;
      padding-top: 12px;
      padding-bottom: 38px;
    }
    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .header-logo { max-height: 36px; max-width: 140px; display: block; }
    .header-name { color: {{color_primario}}; font-size: 17pt; font-weight: bold; line-height: 1.1; }
    .header-tagline { color: #94a3b8; font-size: 8pt; margin-top: 2px; }
    .header-right { text-align: right; font-size: 8pt; color: #64748b; line-height: 1.6; }
    .hr-primary { border: none; border-top: 1.5px solid {{color_primario}}; margin: 4px 0 2px; }
    .hr-light   { border: none; border-top: 0.5px solid #e2e8f0; }
    .title-band {
      background: {{color_primario}};
      color: {{on_primario}};
      font-weight: bold;
      font-size: 9.5pt;
      letter-spacing: 0.05em;
      text-align: center;
      padding: 5px 0;
      margin: 6px 0 8px;
      text-transform: uppercase;
    }
    .body-text { line-height: 1.4; text-align: justify; margin-bottom: 8px; font-size: 8.5pt; }
    .section-heading {
      color: {{color_primario}};
      font-weight: bold;
      font-size: 7.5pt;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 4px;
      margin-top: 8px;
    }
    /* Datos del inmueble */
    .prop-box {
      background: #f8fafc;
      border-left: 3px solid {{color_primario}};
      padding: 4px 10px;
      margin-bottom: 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 10px;
    }
    .prop-row {
      display: flex;
      flex-direction: column;
      padding: 3px 4px;
      font-size: 8pt;
      border-bottom: 0.5px solid #e2e8f0;
    }
    .prop-row:last-child { border-bottom: none; }
    .prop-row.full-width { grid-column: 1 / -1; }
    .prop-label { color: #94a3b8; text-transform: uppercase; font-size: 6.5pt; margin-bottom: 1px; }
    .prop-value { font-weight: bold; color: #1e293b; }
    /* Bloques de comisión */
    .comision-cols {
      display: grid;
      gap: 8px;
    }
    .comision-cols.dos { grid-template-columns: 1fr 1fr; }
    .comision-cols.uno { grid-template-columns: 1fr; }
    .comision-block {
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      margin-bottom: 6px;
      overflow: hidden;
    }
    .comision-header {
      background: {{color_primario}};
      color: {{on_primario}};
      font-weight: bold;
      font-size: 7.5pt;
      padding: 4px 8px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .comision-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 8px;
      font-size: 8pt;
      border-bottom: 0.5px solid #f1f5f9;
    }
    .comision-row:last-child { border-bottom: none; }
    .comision-row.total {
      background: #f8fafc;
      font-weight: bold;
      border-top: 1px solid {{color_primario}};
    }
    .comision-row.escenario-b {
      background: #eff6ff;
      border-top: 1px dashed #bfdbfe;
    }
    .comision-label { color: #475569; }
    .comision-value { color: #0f172a; font-weight: bold; text-align: right; }
    .comision-value.highlight { color: {{color_primario}}; }
    .renta-nota {
      font-size: 7pt;
      color: #64748b;
      font-style: italic;
      padding: 3px 8px 4px;
      background: #f8fafc;
      border-top: 0.5px solid #e2e8f0;
      line-height: 1.4;
    }
    /* Cláusulas */
    .clausulas { font-size: 8pt; line-height: 1.4; text-align: justify; color: #374151; margin-bottom: 8px; }
    /* Firmas */
    .sig-row { display: flex; gap: 32px; margin-top: 12px; }
    .sig-block { flex: 1; }
    .sig-line { border-top: 0.75px solid #1e293b; margin-bottom: 4px; padding-top: 6px; }
    .sig-name { font-weight: bold; font-size: 8.5pt; }
    .sig-role { color: #64748b; font-size: 7.5pt; }
    .sig-contact { color: #94a3b8; font-size: 7.5pt; }
    .sig-date { color: #94a3b8; font-size: 7.5pt; margin-top: 10px; }
    /* Footer */
    .footer {
      position: fixed; bottom: 0; left: 5px; right: 0;
      height: 28px;
      background: #f8fafc;
      border-top: 0.5px solid #e2e8f0;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 42px 0 45px;
      font-size: 7pt;
    }
    .footer-text { color: #94a3b8; }
    .footer-ref  { color: {{color_primario}}; font-weight: bold; }
    .footer-bottom-bar {
      position: fixed; bottom: 0; left: 0; right: 0;
      height: 3px; background: {{color_oscuro}};
    }
  </style>
</head>
<body>
  <div class="sidebar"></div>
  <div class="top-bar"></div>

  <div class="content">

    <!-- Header: logo/nombre a la izquierda, ref+fecha a la derecha -->
    <div class="header">
      <div>
        {{#if logo_src}}
          <img class="header-logo" src="{{{logo_src}}}" alt="{{empresa_nombre}}">
          {{#if tagline}}<div class="header-tagline">{{tagline}}</div>{{/if}}
        {{else}}
          <div class="header-name">{{empresa_nombre}}</div>
          {{#if tagline}}<div class="header-tagline">{{tagline}}</div>{{/if}}
        {{/if}}
      </div>
      <div class="header-right">
        <strong>Ref:</strong> {{ref_num}}<br>
        {{fecha}}
      </div>
    </div>

    <hr class="hr-primary">
    <hr class="hr-light">

    <div class="title-band">Carta de Compromiso de Comisión</div>

    <!-- Párrafo de apertura -->
    <p class="body-text">
      Yo, <strong>{{propietario_nombre}}</strong>, con plena capacidad legal para contratar, en calidad de
      propietario(a) del inmueble descrito a continuación, me comprometo a reconocer y pagar los honorarios
      acordados a <strong>{{empresa_nombre}}</strong> en caso de concretarse la
      <strong>{{gestion_texto}}</strong> del mismo mediante su intermediación, en los términos detallados
      en la presente carta.
    </p>

    <!-- Datos del inmueble -->
    <div class="section-heading">Datos del Inmueble</div>
    <div class="prop-box">
      <div class="prop-row">
        <span class="prop-label">Código</span>
        <span class="prop-value">{{codigo_propiedad}}</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Tipo</span>
        <span class="prop-value">{{tipo_inmueble}}</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Gestión</span>
        <span class="prop-value">{{gestion}}</span>
      </div>
      {{#if precio_referencia}}
      <div class="prop-row">
        <span class="prop-label">Precio de referencia</span>
        <span class="prop-value">{{precio_referencia}}</span>
      </div>
      {{/if}}
      <div class="prop-row full-width">
        <span class="prop-label">Descripción</span>
        <span class="prop-value">{{titulo_propiedad}}</span>
      </div>
      <div class="prop-row full-width">
        <span class="prop-label">Ubicación</span>
        <span class="prop-value">{{ubicacion}}{{#if direccion}} — {{direccion}}{{/if}}</span>
      </div>
    </div>

    <!-- Acuerdo de comisión -->
    <div class="section-heading">Acuerdo de Comisión</div>
    <p class="body-text">
      Me comprometo a pagar a <strong>{{empresa_nombre}}</strong>, en concepto de honorarios profesionales
      por la gestión de {{gestion_texto}} del inmueble descrito, la comisión acordada más el Impuesto al
      Valor Agregado (IVA) aplicable, pagadera al momento de la formalización o suscripción del contrato
      correspondiente. El detalle del cálculo se presenta a continuación:
    </p>

    <div class="comision-cols {{#if es_ambas}}dos{{else}}uno{{/if}}">

      {{#if es_venta}}
      {{#if venta_precio}}
      <div>
        <div class="comision-block">
          <div class="comision-header">{{#if es_ambas}}Comisión — Venta{{else}}Detalle de Comisión{{/if}}</div>
          <div class="comision-row">
            <span class="comision-label">Precio de venta (ref.)</span>
            <span class="comision-value">{{venta_precio}}</span>
          </div>
          <div class="comision-row">
            <span class="comision-label">Comisión {{comision_pct}}%</span>
            <span class="comision-value">{{venta_comision_base}}</span>
          </div>
          <div class="comision-row">
            <span class="comision-label">IVA ({{iva_pct_display}})</span>
            <span class="comision-value">{{venta_iva_monto}}</span>
          </div>
          <div class="comision-row total">
            <span class="comision-label">Total estimado</span>
            <span class="comision-value highlight">{{venta_comision_total}}</span>
          </div>
        </div>
      </div>
      {{/if}}
      {{/if}}

      {{#if es_renta}}
      {{#if renta_precio}}
      <div>
        <div class="comision-block">
          <div class="comision-header">{{#if es_ambas}}Comisión — Renta{{else}}Detalle de Comisión{{/if}}</div>
          <div class="comision-row">
            <span class="comision-label">Renta mensual (ref.)</span>
            <span class="comision-value">{{renta_precio}}</span>
          </div>
          <div class="comision-row" style="background:#f0fdf4;">
            <span class="comision-label" style="color:#166534;font-weight:bold;">Contrato &lt; 5 años — 1 renta</span>
            <span class="comision-value" style="color:#166534;">IVA incluido</span>
          </div>
          <div class="comision-row">
            <span class="comision-label" style="padding-left:8px;">Neto sin IVA</span>
            <span class="comision-value">{{renta_esc_a_neta}}</span>
          </div>
          <div class="comision-row">
            <span class="comision-label" style="padding-left:8px;">IVA ({{iva_pct_display}})</span>
            <span class="comision-value">{{renta_esc_a_iva}}</span>
          </div>
          <div class="comision-row total">
            <span class="comision-label">Total estimado</span>
            <span class="comision-value highlight">{{renta_esc_a_total}}</span>
          </div>
          <div class="comision-row escenario-b">
            <span class="comision-label" style="color:#1e40af;font-weight:bold;">Contrato &gt; 5 años</span>
            <span class="comision-value" style="color:#1e40af;font-size:7.5pt;">1 renta / 5 años <em>(negociable)</em></span>
          </div>
          <div class="renta-nota">
            Para contratos mayores a 5 años, la comisión equivale a 1 renta mensual
            por cada período completo de 5 años. Monto sujeto a negociación entre las partes.
          </div>
        </div>
      </div>
      {{/if}}
      {{/if}}

    </div>

    <!-- Cláusulas adicionales -->
    <div class="clausulas">{{{clausulas_custom}}}</div>

    <!-- Firmas -->
    <div class="sig-row">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">{{propietario_nombre}}</div>
        <div class="sig-role">Propietario(a)</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">{{agente_nombre}}</div>
        <div class="sig-role">Agente · {{empresa_nombre}}</div>
        {{#if agente_email}}<div class="sig-contact">{{agente_email}}</div>{{/if}}
      </div>
    </div>
    <div class="sig-date">Lugar y fecha: _________________________</div>

  </div>

  <div class="footer">
    <span class="footer-text">Documento generado automáticamente — {{empresa_nombre}} CRM</span>
    <span class="footer-ref">{{ref_num}}</span>
  </div>
  <div class="footer-bottom-bar"></div>
</body>
</html>`;
