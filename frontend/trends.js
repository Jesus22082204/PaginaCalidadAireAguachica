// trends.js — Add-on que agrega 'Tendencias y distribución' sin tocar tu script.js existente
(function(){
  const API_BASE = "http://127.0.0.1:5000/api";
  let chartPM25 = null, chartPM10 = null, chartAQI = null;

  function getActiveLocationId(){
    // Busca el item activo en la barra lateral (clase .active) y extrae el id del onclick
    const active = document.querySelector('.point-item.active');
    if(!active){
      return 'aguachica_general';
    }
    const attr = active.getAttribute('onclick') || '';
    const m = attr.match(/showPointDetails\('([^']+)'\)/);
    return (m && m[1]) ? m[1] : 'aguachica_general';
  }

  function formatHour(iso){
    try{
      const d = new Date(iso);
      const h = String(d.getHours()).padStart(2,'0');
      const m = String(d.getMinutes()).padStart(2,'0');
      return `${h}:${m}`;
    }catch(_){
      return iso;
    }
  }

  function showTrendsError(codeOrMessage){
    const section = document.getElementById('trendsSection');
    if(section) section.hidden = false;
    const msg = document.getElementById('trendsMsg');
    const text = (codeOrMessage === 'not_enough_data')
      ? 'No se pudieron generar las tendencias. Revisa que haya datos históricos suficientes (ejecuta el backfill de 5 días y recarga).'
      : 'No se pudieron generar las tendencias. Intenta de nuevo.';
    if(msg){
      msg.innerHTML = `<div class="bg-red-50 text-red-700 px-3 py-2 rounded">${text}</div>`;
    }
  }

  function renderCharts(payload){
    const section = document.getElementById('trendsSection');
    const msg = document.getElementById('trendsMsg');
    if(section) section.hidden = false;
    if(msg) msg.textContent = '';

    // Preparar series
    const pm25 = payload.pm25_24h || [];
    const pm10 = payload.pm10_24h || [];
    const labels25 = pm25.map(p => formatHour(p.t));
    const data25 = pm25.map(p => p.v);
    const labels10 = pm10.map(p => formatHour(p.t));
    const data10 = pm10.map(p => p.v);

    // Destruir previos
    if(chartPM25){ chartPM25.destroy(); }
    if(chartPM10){ chartPM10.destroy(); }
    if(chartAQI){ chartAQI.destroy(); }

    // PM2.5
    const ctx25 = document.getElementById('pm25Trend');
    if(ctx25){
      chartPM25 = new Chart(ctx25.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels25,
          datasets: [{
            label: 'PM₂.₅ (µg/m³)',
            data: data25,
            fill: false,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true } },
          scales: { x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } } }
        }
      });
    }

    // PM10
    const ctx10 = document.getElementById('pm10Trend');
    if(ctx10){
      chartPM10 = new Chart(ctx10.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels10,
          datasets: [{
            label: 'PM₁₀ (µg/m³)',
            data: data10,
            fill: false,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true } },
          scales: { x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } } }
        }
      });
    }

    // Distribución AQI 7 días
    const dist = payload.aqi_distribution_7d || {};
    const labelsAQI = ['1 Bueno', '2 Aceptable', '3 Moderado', '4 Malo', '5 Muy malo'];
    const dataAQI = [1,2,3,4,5].map(k => dist[String(k)] || 0);

    const ctxAqi = document.getElementById('aqiDistribution');
    if(ctxAqi){
      chartAQI = new Chart(ctxAqi.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: labelsAQI,
          datasets: [{ label: 'Horas en rango (7d)', data: dataAQI }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  async function loadTrendsAndDistributions(){
    const btn = document.getElementById('btnGenerarInterpretacion');
    const original = btn ? btn.textContent : null;
    if(btn){ btn.disabled = true; btn.textContent = 'Generando...'; }

    try{
      const loc = getActiveLocationId();
      const res = await fetch(`${API_BASE}/trends/${loc}`);
      const json = await res.json();
      if(!json.success){
        showTrendsError(json.error || 'unknown');
        return;
      }
      renderCharts(json);
    }catch(err){
      console.error(err);
      showTrendsError('unknown');
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = original || 'Generar Interpretación'; }
    }
  }

  // Hook al botón "Generar Interpretación" (no cambiamos su texto/estilos)
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnGenerarInterpretacion') ||
                document.querySelector('section button.w-full.bg-blue-600');
    if(btn){
      btn.addEventListener('click', loadTrendsAndDistributions);
    }
  });
})();