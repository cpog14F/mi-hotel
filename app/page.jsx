"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ikgmgheiphstizuvgfix.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZ21naGVpcGhzdGl6dXZnZml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NjE5NDEsImV4cCI6MjA5MzIzNzk0MX0.uUethOO-2R6IxAl3McPyCbvNt3ZbAhJAsfHh0TH2fu4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DIAS  = ["L","M","X","J","V","S","D"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const toYMD         = (d) => d.toISOString().slice(0,10);
const addDays       = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const nightsBetween = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
const fmtDate       = (s) => {
  if(!s) return "";
  const d = new Date(s+"T12:00:00");
  return `${["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"][d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()].slice(0,3).toUpperCase()}`;
};

function getMonthGrid(year,month){
  const first=new Date(year,month,1), last=new Date(year,month+1,0);
  let dow=first.getDay(); dow=dow===0?6:dow-1;
  const days=[];
  for(let i=0;i<dow;i++) days.push(null);
  for(let d=1;d<=last.getDate();d++) days.push(new Date(year,month,d));
  return days;
}

function getOccupiedDays(reservas){
  const map={};
  reservas.forEach(r=>{
    if(r.estado==="cancelada") return;
    const roomCount=(r.reserva_habitaciones||[]).length||1;
    let cur=new Date(r.fecha_entrada+"T12:00:00");
    const end=new Date(r.fecha_salida+"T12:00:00");
    while(cur<end){ const k=toYMD(cur); map[k]=(map[k]||0)+roomCount; cur=addDays(cur,1); }
  });
  return map;
}

// ── CSS (OS dark/light mode via CSS variables) ────────────────────────────────
const THEME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lato:wght@400;700;900&display=swap');
  :root {
    --bg:#f5f5f0; --surface:#ffffff; --surface2:#f0f0eb; --border:#e0e0d8;
    --text:#1a1a2e; --muted:#6b7280; --accent:#2c3e50; --primary:#c0392b;
    --green:#16a34a; --orange:#d97706; --blue:#2563eb; --red:#c0392b;
    --green-bg:#f0fdf4; --orange-bg:#fffbeb; --red-bg:#fef2f2;
    --shadow:0 1px 8px rgba(0,0,0,0.08);
  }
  @media(prefers-color-scheme:dark){
    :root {
      --bg:#0f1117; --surface:#1a1d27; --surface2:#232635; --border:#2e3245;
      --text:#e8eaf0; --muted:#8b93a8; --accent:#3d5a80; --primary:#e05252;
      --green:#34d399; --orange:#fbbf24; --blue:#60a5fa; --red:#e05252;
      --green-bg:#052e16; --orange-bg:#1c1108; --red-bg:#1f0a0a;
      --shadow:0 1px 8px rgba(0,0,0,0.4);
    }
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{background:var(--bg);color:var(--text);font-family:'Lato',sans-serif;}
  input,select,button,textarea{font-family:'Lato',sans-serif;}
  input[type=text],input[type=tel],input[type=number],input[type=date],select{
    background:var(--surface2)!important;color:var(--text)!important;
    border:1.5px solid var(--border)!important;
  }
  input::placeholder{color:var(--muted)!important;}
  input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.4);}
  @media(prefers-color-scheme:dark){
    input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.7);}
  }
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-track{background:var(--bg);}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
  .app-shell{max-width:1200px;margin:0 auto;min-height:100vh;background:var(--bg);}
  .card{background:var(--surface);border-radius:14px;box-shadow:var(--shadow);border:1px solid var(--border);}
  @media(min-width:768px){
    .desktop-grid{display:grid;grid-template-columns:400px 1fr;min-height:calc(100vh - 56px);}
    .left-panel{border-right:1px solid var(--border);overflow-y:auto;max-height:calc(100vh - 56px);position:sticky;top:56px;}
    .right-panel{overflow-y:auto;max-height:calc(100vh - 56px);}
  }
  @media(max-width:767px){
    .desktop-grid{display:block;}
    .left-panel,.right-panel{max-height:none;}
  }
  .room-chip{
    display:inline-flex;align-items:center;gap:5px;padding:7px 13px;
    border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;
    border:2px solid var(--border);background:var(--surface2);color:var(--muted);
    transition:all 0.15s;user-select:none;
  }
  .room-chip.sel{background:var(--primary);color:#fff;border-color:var(--primary);}
  button:active{opacity:0.82;}
`;

const bStyle = {fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,letterSpacing:0.3};
function Semaforo({count,total}){
  if(count===0) return <span style={{...bStyle,color:"var(--green)",background:"var(--green-bg)"}}>● Disponible</span>;
  if(count>=total) return <span style={{...bStyle,color:"var(--red)",background:"var(--red-bg)"}}>● Completo</span>;
  return <span style={{...bStyle,color:"var(--orange)",background:"var(--orange-bg)"}}>● Parcial</span>;
}

function Field({label,children}){
  return(
    <div style={{marginBottom:14}}>
      <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",letterSpacing:0.8,display:"block",marginBottom:5}}>{label}</label>
      {children}
    </div>
  );
}
const INP={width:"100%",padding:"11px 14px",borderRadius:10,fontSize:14,outline:"none"};

// ══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const [view,setView]                     = useState("calendar");
  const [reservas,setReservas]             = useState([]);
  const [habitaciones,setHabitaciones]     = useState([]);
  const [selectedDate,setSelectedDate]     = useState(toYMD(new Date()));
  const [selectedReserva,setSelectedReserva]= useState(null);
  const [baseMonth,setBaseMonth]           = useState({year:new Date().getFullYear(),month:new Date().getMonth()});
  const [loading,setLoading]               = useState(true);
  const [dbError,setDbError]               = useState(null);
  const [formMode,setFormMode]             = useState("create");
  const [formData,setFormData]             = useState({nombre:"",telefono:"",anticipo:"",total:"",fecha_entrada:"",fecha_salida:"",habitacion_ids:[]});

  const fetchAll = useCallback(async()=>{
    setLoading(true);
    const [{data:r,error:re},{data:h,error:he}] = await Promise.all([
      supabase.from("reservas").select("*, reserva_habitaciones(habitacion_id, habitaciones(tipo,numero))").order("fecha_entrada"),
      supabase.from("habitaciones").select("*").order("id"),
    ]);
    if(re||he) setDbError("Error de conexión. Verifica las tablas en Supabase.");
    else setDbError(null);
    setReservas(r||[]);
    setHabitaciones(h||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  const today       = toYMD(new Date());
  const occupiedMap = getOccupiedDays(reservas);

  const dayReservas = reservas.filter(r=>{
    if(r.estado==="cancelada") return false;
    return r.fecha_entrada<=selectedDate&&r.fecha_salida>selectedDate;
  });

  const occupiedRoomIds = new Set(dayReservas.flatMap(r=>(r.reserva_habitaciones||[]).map(rh=>rh.habitacion_id)));
  const availableRooms  = habitaciones.filter(h=>!occupiedRoomIds.has(h.id));

  async function saveReserva(local){
    if(!local.nombre||!local.fecha_entrada||!local.fecha_salida||local.habitacion_ids.length===0){
      alert("Completa nombre, fechas y selecciona al menos una habitación.");
      return false;
    }
    const payload={
      nombre_huesped:local.nombre, telefono:local.telefono,
      anticipo:parseFloat(local.anticipo)||0, total:parseFloat(local.total)||0,
      fecha_entrada:local.fecha_entrada, fecha_salida:local.fecha_salida, estado:"activa",
    };
    if(formMode==="create"){
      const {data:newR,error}=await supabase.from("reservas").insert(payload).select().single();
      if(error){alert("Error: "+error.message);return false;}
      await supabase.from("reserva_habitaciones").insert(local.habitacion_ids.map(hid=>({reserva_id:newR.id,habitacion_id:parseInt(hid)})));
    } else {
      await supabase.from("reservas").update(payload).eq("id",selectedReserva.id);
      await supabase.from("reserva_habitaciones").delete().eq("reserva_id",selectedReserva.id);
      await supabase.from("reserva_habitaciones").insert(local.habitacion_ids.map(hid=>({reserva_id:selectedReserva.id,habitacion_id:parseInt(hid)})));
    }
    await fetchAll();
    return true;
  }

  // ── MonthGrid ─────────────────────────────────────────────────────────────
  function MonthGrid({year,month}){
    const days=getMonthGrid(year,month);
    return(
      <div style={{marginBottom:4}}>
        <div style={{textAlign:"center",fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:"var(--accent)",marginBottom:8}}>
          {MESES[month]} {year}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {DIAS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"var(--muted)",padding:"2px 0"}}>{d}</div>)}
          {days.map((d,i)=>{
            if(!d) return <div key={`e${i}`}/>;
            const ymd=toYMD(d), cnt=occupiedMap[ymd]||0;
            const isSel=ymd===selectedDate, isToday=ymd===today;
            const isFull=cnt>=habitaciones.length&&habitaciones.length>0;
            return(
              <div key={ymd} onClick={()=>setSelectedDate(ymd)} style={{
                textAlign:"center",padding:"5px 2px",borderRadius:7,cursor:"pointer",
                background:isSel?"var(--primary)":isFull?"rgba(192,57,43,0.13)":cnt>0?"rgba(217,119,6,0.1)":"transparent",
                border:isToday&&!isSel?"2px solid var(--primary)":"2px solid transparent",transition:"all 0.12s",
              }}>
                <span style={{fontSize:12,fontWeight:isSel||isToday?700:400,color:isSel?"#fff":cnt>0?"var(--red)":"var(--text)"}}>
                  {d.getDate()}
                </span>
                {!isSel&&<div style={{width:4,height:4,borderRadius:"50%",background:cnt===0?"var(--green)":isFull?"var(--red)":"var(--orange)",margin:"1px auto 0"}}/>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Calendar View ─────────────────────────────────────────────────────────
  function CalendarView(){
    const months=[];
    for(let i=0;i<2;i++){
      let m=baseMonth.month+i, y=baseMonth.year;
      if(m>11){m-=12;y++;}
      months.push({year:y,month:m});
    }
    return(
      <>
        <div style={{background:"var(--accent)",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
          <span style={{color:"#fff",fontSize:17,fontWeight:800,fontFamily:"'Playfair Display',serif"}}>🏨 Sistema de Reservas</span>
          <Semaforo count={occupiedRoomIds.size} total={habitaciones.length}/>
        </div>
        {loading?(
          <div style={{textAlign:"center",padding:48,color:"var(--muted)"}}>Cargando...</div>
        ):dbError?(
          <div style={{margin:16,background:"var(--red-bg)",borderRadius:12,padding:16,color:"var(--red)",fontSize:13,border:"1px solid var(--border)"}}>
            ⚠️ {dbError}
            <div style={{marginTop:8,fontSize:11,color:"var(--muted)"}}>
              Ejecuta el SQL de migración en Supabase → SQL Editor para crear las tablas necesarias.
            </div>
          </div>
        ):(
          <div className="desktop-grid">
            <div className="left-panel" style={{padding:16}}>
              {months.map(({year,month})=>(
                <div key={`${year}-${month}`} className="card" style={{padding:14,marginBottom:12}}>
                  <MonthGrid year={year} month={month}/>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <button onClick={()=>setBaseMonth(({year,month})=>{const m=month-2;return m<0?{year:year-1,month:m+12}:{year,month:m};})}
                  style={{flex:1,background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:10,padding:"10px 0",fontSize:13,fontWeight:700,color:"var(--accent)",cursor:"pointer"}}>
                  ‹ Anteriores
                </button>
                <button onClick={()=>setBaseMonth(({year,month})=>{const m=month+2;return m>11?{year:year+1,month:m-12}:{year,month:m};})}
                  style={{flex:1,background:"var(--primary)",border:"none",borderRadius:10,padding:"10px 0",fontSize:13,fontWeight:700,color:"#fff",cursor:"pointer"}}>
                  Siguientes ›
                </button>
              </div>
              <div style={{display:"flex",gap:14,justifyContent:"center",fontSize:11,color:"var(--muted)",fontWeight:700,padding:"6px 0"}}>
                <span>🟢 Libre</span><span>🟡 Parcial</span><span>🔴 Lleno</span>
              </div>
            </div>
            <div className="right-panel" style={{padding:16}}><DayPanel/></div>
          </div>
        )}
      </>
    );
  }

  // ── Day Panel ─────────────────────────────────────────────────────────────
  function DayPanel(){
    const d=new Date(selectedDate+"T12:00:00");
    const label=`${["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"][d.getDay()].toUpperCase()} ${d.getDate()} ${MESES[d.getMonth()].toUpperCase()}`;
    return(
      <div>
        <div className="card" style={{overflow:"hidden",marginBottom:14}}>
          <div style={{background:"var(--accent)",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>setSelectedDate(toYMD(addDays(new Date(selectedDate+"T12:00:00"),-1)))}
              style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}}>‹</button>
            <span style={{color:"#fff",fontWeight:700,fontSize:14,fontFamily:"'Playfair Display',serif"}}>{label}</span>
            <button onClick={()=>setSelectedDate(toYMD(addDays(new Date(selectedDate+"T12:00:00"),1)))}
              style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}}>›</button>
          </div>
          <div style={{display:"flex",padding:"12px 16px",gap:12,borderBottom:"1px solid var(--border)"}}>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:900,color:"var(--red)"}}>{occupiedRoomIds.size}</div>
              <div style={{fontSize:10,color:"var(--muted)",fontWeight:700}}>OCUPADAS</div>
            </div>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:900,color:"var(--green)"}}>{availableRooms.length}</div>
              <div style={{fontSize:10,color:"var(--muted)",fontWeight:700}}>LIBRES</div>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <Semaforo count={occupiedRoomIds.size} total={habitaciones.length}/>
            </div>
          </div>
          {availableRooms.length>0&&(
            <div style={{padding:"10px 16px",display:"flex",flexWrap:"wrap",gap:6,borderBottom:"1px solid var(--border)"}}>
              {availableRooms.map(h=>(
                <span key={h.id} style={{...bStyle,color:"var(--green)",background:"var(--green-bg)",fontSize:12}}>
                  {h.numero} · {h.tipo}
                </span>
              ))}
            </div>
          )}
          <div style={{padding:"12px 16px"}}>
            <button onClick={()=>{
              setFormData({nombre:"",telefono:"",anticipo:"",total:"",fecha_entrada:selectedDate,fecha_salida:"",habitacion_ids:[]});
              setFormMode("create"); setView("form");
            }} style={{width:"100%",background:"var(--primary)",color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontWeight:800,fontSize:14,cursor:"pointer"}}>
              + Nueva Reserva
            </button>
          </div>
        </div>

        {dayReservas.length===0?(
          <div style={{textAlign:"center",color:"var(--muted)",fontSize:14,padding:"32px 0"}}>Sin reservas este día</div>
        ):dayReservas.map(r=>{
          const nights=nightsBetween(r.fecha_entrada,r.fecha_salida);
          const restante=(r.total||0)-(r.anticipo||0);
          const rooms=r.reserva_habitaciones||[];
          return(
            <div key={r.id} className="card" onClick={()=>{setSelectedReserva(r);setView("detail");}}
              style={{display:"flex",alignItems:"stretch",marginBottom:10,cursor:"pointer",overflow:"hidden"}}>
              <div style={{width:52,background:"var(--primary)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 4px"}}>
                {rooms.slice(0,2).map(rh=>(
                  <span key={rh.habitacion_id} style={{color:"#fff",fontSize:13,fontWeight:800}}>{rh.habitaciones?.numero}</span>
                ))}
                {rooms.length>2&&<span style={{color:"#ffffff99",fontSize:10}}>+{rooms.length-2}</span>}
              </div>
              <div style={{flex:1,padding:"10px 14px"}}>
                <div style={{fontSize:14,fontWeight:900,color:"var(--text)",letterSpacing:-0.3}}>{r.nombre_huesped?.toUpperCase()}</div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{fmtDate(r.fecha_entrada)} → {fmtDate(r.fecha_salida)}</div>
                <div style={{display:"flex",gap:10,marginTop:5,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:"var(--muted)"}}>🌙 {nights} noche{nights!==1?"s":""}</span>
                  {rooms.length>1&&<span style={{fontSize:11,color:"var(--blue)",fontWeight:700}}>🛏 {rooms.length} hab.</span>}
                  {restante>0&&<span style={{fontSize:11,color:"var(--orange)",fontWeight:700}}>Pendiente: ${restante.toLocaleString()}</span>}
                  {restante<=0&&r.total>0&&<span style={{fontSize:11,color:"var(--green)",fontWeight:700}}>✓ Liquidado</span>}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",paddingRight:12,color:"var(--muted)",fontSize:18}}>›</div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Detail View ───────────────────────────────────────────────────────────
  function DetailView(){
    const r=selectedReserva; if(!r) return null;
    const nights=nightsBetween(r.fecha_entrada,r.fecha_salida);
    const restante=(r.total||0)-(r.anticipo||0);
    const rooms=r.reserva_habitaciones||[];
    async function handleCancel(){
      if(!confirm("¿Cancelar esta reserva?")) return;
      await supabase.from("reservas").update({estado:"cancelada"}).eq("id",r.id);
      fetchAll(); setView("calendar");
    }
    return(
      <div>
        <div style={{background:"var(--accent)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10}}>
          <button onClick={()=>setView("calendar")} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer"}}>‹</button>
          <span style={{color:"#fff",fontWeight:700,fontSize:15,fontFamily:"'Playfair Display',serif",flex:1}}>
            {rooms.map(rh=>`${rh.habitaciones?.numero}·${rh.habitaciones?.tipo}`).join(" / ")}
          </span>
          <button onClick={()=>{
            setFormData({nombre:r.nombre_huesped,telefono:r.telefono,anticipo:r.anticipo,total:r.total,
              fecha_entrada:r.fecha_entrada,fecha_salida:r.fecha_salida,habitacion_ids:rooms.map(rh=>rh.habitacion_id)});
            setFormMode("edit"); setView("form");
          }} style={{background:"none",border:"none",color:"#ffcc00",fontSize:20,cursor:"pointer"}}>✏️</button>
        </div>
        <div style={{padding:16,maxWidth:640,margin:"0 auto"}}>
          <div className="card" style={{padding:18,marginBottom:12}}>
            <div style={{fontSize:22,fontWeight:900,color:"var(--text)",fontFamily:"'Playfair Display',serif",marginBottom:12}}>{r.nombre_huesped?.toUpperCase()}</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div><div style={{fontSize:10,color:"var(--muted)",fontWeight:700}}>ENTRADA</div><div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{fmtDate(r.fecha_entrada)}</div></div>
              <div style={{color:"var(--muted)",paddingBottom:2}}>→</div>
              <div><div style={{fontSize:10,color:"var(--muted)",fontWeight:700}}>SALIDA</div><div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{fmtDate(r.fecha_salida)}</div></div>
              <div style={{marginLeft:"auto"}}><div style={{fontSize:10,color:"var(--muted)",fontWeight:700}}>NOCHES</div><div style={{fontSize:22,fontWeight:900,color:"var(--accent)"}}>🌙{nights}</div></div>
            </div>
          </div>
          <div className="card" style={{padding:18,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:800,color:"var(--red)",letterSpacing:1,marginBottom:10}}>HABITACIONES</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {rooms.map(rh=>(
                <span key={rh.habitacion_id} style={{background:"var(--surface2)",border:"1.5px solid var(--border)",borderRadius:10,padding:"6px 14px",fontSize:13,fontWeight:700,color:"var(--text)"}}>
                  {rh.habitaciones?.numero} · {rh.habitaciones?.tipo}
                </span>
              ))}
            </div>
          </div>
          <div className="card" style={{padding:18,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:800,color:"var(--red)",letterSpacing:1,marginBottom:12}}>COBRO</div>
            {[["Importe total",`$${(r.total||0).toLocaleString()}`,"var(--text)"],["Anticipo / Señal",`$${(r.anticipo||0).toLocaleString()}`,"var(--green)"]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{color:"var(--muted)",fontSize:14}}>{l}</span>
                <span style={{fontWeight:700,fontSize:14,color:c}}>{v}</span>
              </div>
            ))}
            <div style={{height:1,background:"var(--border)",margin:"10px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontWeight:800,fontSize:15,color:"var(--text)"}}>Pendiente</span>
              <span style={{fontWeight:900,fontSize:18,color:restante>0?"var(--orange)":"var(--green)"}}>${restante.toLocaleString()}</span>
            </div>
          </div>
          <div className="card" style={{padding:18,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:800,color:"var(--red)",letterSpacing:1,marginBottom:12}}>CONTACTO</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span>👤</span><span style={{fontSize:14,color:"var(--text)"}}>{r.nombre_huesped}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span>📞</span><a href={`tel:${r.telefono}`} style={{fontSize:14,color:"var(--blue)",fontWeight:700,textDecoration:"none"}}>{r.telefono}</a></div>
          </div>
          <button onClick={handleCancel} style={{width:"100%",background:"var(--red-bg)",color:"var(--red)",border:"2px solid var(--red)",borderRadius:12,padding:"13px 0",fontWeight:800,fontSize:14,cursor:"pointer"}}>
            Cancelar Reserva
          </button>
        </div>
      </div>
    );
  }

  // ── Form View ─────────────────────────────────────────────────────────────
  function FormView(){
    const [local,setLocal]=useState(formData);
    const restante=(parseFloat(local.total)||0)-(parseFloat(local.anticipo)||0);
    function toggleRoom(id){
      setLocal(prev=>({...prev,habitacion_ids:prev.habitacion_ids.includes(id)?prev.habitacion_ids.filter(x=>x!==id):[...prev.habitacion_ids,id]}));
    }
    async function handleSubmit(){ const ok=await saveReserva(local); if(ok) setView("calendar"); }
    return(
      <div>
        <div style={{background:"var(--accent)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10}}>
          <button onClick={()=>setView("calendar")} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer"}}>‹</button>
          <span style={{color:"#fff",fontWeight:700,fontSize:15,fontFamily:"'Playfair Display',serif"}}>
            {formMode==="create"?"Nueva Reserva":"Editar Reserva"}
          </span>
        </div>
        <div style={{padding:16,maxWidth:640,margin:"0 auto"}}>
          <div className="card" style={{padding:18,marginBottom:16}}>
            <Field label="NOMBRE DEL HUÉSPED">
              <input type="text" value={local.nombre} onChange={e=>setLocal({...local,nombre:e.target.value})} style={INP} placeholder="Nombre completo"/>
            </Field>
            <Field label="TELÉFONO">
              <input type="tel" value={local.telefono} onChange={e=>setLocal({...local,telefono:e.target.value})} style={INP} placeholder="Número de teléfono"/>
            </Field>
            <Field label="HABITACIONES — selecciona una o más">
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {habitaciones.map(h=>(
                  <div key={h.id} className={`room-chip${local.habitacion_ids.includes(h.id)?" sel":""}`} onClick={()=>toggleRoom(h.id)}>
                    {local.habitacion_ids.includes(h.id)&&<span>✓</span>}
                    {h.numero} · {h.tipo}
                  </div>
                ))}
              </div>
              {local.habitacion_ids.length>0&&(
                <div style={{marginTop:8,fontSize:12,color:"var(--blue)",fontWeight:700}}>
                  {local.habitacion_ids.length} habitación(es) seleccionada(s)
                </div>
              )}
            </Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="ENTRADA">
                <input type="date" value={local.fecha_entrada} onChange={e=>setLocal({...local,fecha_entrada:e.target.value})} style={{...INP,fontSize:13}}/>
              </Field>
              <Field label="SALIDA">
                <input type="date" value={local.fecha_salida} onChange={e=>setLocal({...local,fecha_salida:e.target.value})} style={{...INP,fontSize:13}}/>
              </Field>
            </div>
            {local.fecha_entrada&&local.fecha_salida&&local.fecha_salida>local.fecha_entrada&&(
              <div style={{background:"var(--surface2)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"var(--accent)",fontWeight:700,border:"1px solid var(--border)"}}>
                🌙 {nightsBetween(local.fecha_entrada,local.fecha_salida)} noche(s)
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="TOTAL ($)">
                <input type="number" value={local.total} onChange={e=>setLocal({...local,total:e.target.value})} style={INP} placeholder="0"/>
              </Field>
              <Field label="ANTICIPO ($)">
                <input type="number" value={local.anticipo} onChange={e=>setLocal({...local,anticipo:e.target.value})} style={INP} placeholder="0"/>
              </Field>
            </div>
            <div style={{background:restante>0?"var(--orange-bg)":"var(--green-bg)",borderRadius:12,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid var(--border)",marginTop:4}}>
              <span style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>Restante a cobrar</span>
              <span style={{fontSize:22,fontWeight:900,color:restante>0?"var(--orange)":"var(--green)"}}>${restante.toLocaleString()}</span>
            </div>
          </div>
          <button onClick={handleSubmit} style={{width:"100%",background:"var(--primary)",color:"#fff",border:"none",borderRadius:12,padding:"15px 0",fontWeight:800,fontSize:15,cursor:"pointer",letterSpacing:0.5}}>
            {formMode==="create"?"Guardar Reserva":"Actualizar Reserva"}
          </button>
        </div>
      </div>
    );
  }

  return(
    <>
      <style>{THEME_CSS}</style>
      <div className="app-shell">
        {view==="calendar"&&<CalendarView/>}
        {view==="detail"&&<DetailView/>}
        {view==="form"&&<FormView/>}
      </div>
    </>
  );
}
