import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { calcolaSaldi } from "@/lib/gestioneMese"

export async function GET(request: Request) {

const { searchParams } = new URL(request.url)
const mese = searchParams.get("mese")

if (!mese) {
return NextResponse.json({ error:"Mese mancante"},{status:400})
}

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* =========================
DATI
========================= */

const { data:movimenti } = await supabase
.from("movimenti_finanziari")
.select("*")
.eq("mese",mese)

/* =========================
LEZIONI INSEGNANTI NON PAGATE
AGGIUNTA
========================= */

const { data:lezioniInsegnanti } = await supabase
.from("lezioni_insegnanti")
.select("*")
.eq("mese",mese)
.eq("stato","svolta")
.eq("pagato",false)

/* LETTURA SOCI DALLO STORICO */

const { data:sociQuote } = await supabase
.from("soci_quote_mese")
.select("*")
.eq("mese", mese)

const soci =
sociQuote?.map(q=>({
id:q.socio_id,
nome:q.nome_socio,
quota_percentuale:q.quota_percentuale
})) || []

const { data:versamentiSoci } = await supabase
.from("versamenti_soci")
.select("*")
.eq("mese",mese)

const { data:meseData } = await supabase
.from("mesi")
.select("saldo_iniziale_cassa,saldo_iniziale_banca")
.eq("mese",mese)
.maybeSingle()

const saldi = await calcolaSaldi(mese)

const saldoInizialeCassa = saldi.saldo_cassa
const saldoInizialeBanca = saldi.saldo_banca

/* =========================
AFFITTO
========================= */

const { data:affittoMese } = await supabase
.from("affitto_mese")
.select("*")
.eq("mese",mese)
.maybeSingle()

const { data:affittoPagamenti } = await supabase
.from("affitto_pagamenti")
.select("*")
.eq("mese",mese)

const costoAffittoTotale = Number(affittoMese?.costo_mensile) || 0

/* =========================
MOVIMENTI
========================= */

const incassi = movimenti?.filter(
m => m.tipo==="incasso" &&
m.categoria!=="trasferimento" &&
m.categoria!=="versamento_socio"
) || []

const spese = movimenti?.filter(
m =>
m.tipo==="spesa" &&
m.categoria !== "rettifica" &&
m.categoria !== "versamento_socio" &&
m.categoria !== "versamenti_soci_batch"
) || []
const insegnantiRaw = movimenti?.filter(
m => m.categoria==="insegnante"
) || []

const totaleIncassi = incassi.reduce((a,m)=>a+Number(m.importo),0)

/* =========================
CALCOLO SPESE
MODIFICA
========================= */

const totaleSpeseMovimenti =
spese.reduce((a,m)=>a+Math.abs(Number(m.importo)),0)

const totaleSpeseLezioni =
lezioniInsegnanti?.reduce((acc,l)=>{

const costo =
Number(l.ore) * Number(l.costo_orario) +
Number(l.rimborso_benzina || 0)

return acc + costo

},0) || 0

const totaleSpese =
totaleSpeseMovimenti + totaleSpeseLezioni
  /* =========================
SPESE PAGATE (NUOVA LOGICA)
========================= */

const spesePagateCassa = movimenti?.filter(m =>
m.tipo === "spesa" &&
m.categoria === "pagamento_insegnante" &&
m.contenitore === "cassa_operativa"
).reduce((a,m)=>a+Math.abs(Number(m.importo)),0) || 0

const spesePagateBanca = movimenti?.filter(m =>
m.tipo === "spesa" &&
m.contenitore === "banca"
).reduce((a,m)=>a+Math.abs(Number(m.importo)),0) || 0
  /* =========================
INSEGNANTI
========================= */

const insegnantiAggregati:Record<string,number>={}

insegnantiRaw.forEach(m=>{

let nome=(m.descrizione || "").toUpperCase()

nome = nome.replace("COMPENSO","").replace("INSEGNANTE","").trim()

if(!nome) nome="ALTRO"

if(!insegnantiAggregati[nome]){
insegnantiAggregati[nome]=0
}

insegnantiAggregati[nome]+=Math.abs(Number(m.importo))

})
const { data: insegnanti } = await supabase
.from("insegnanti")
.select("id,nome")
/* =========================
AGGIUNTA LEZIONI NON PAGATE
========================= */

lezioniInsegnanti?.forEach(l=>{

const costo =
Number(l.ore) * Number(l.costo_orario) +
Number(l.rimborso_benzina || 0)

const ins = insegnanti?.find(i => i.id === l.insegnante_id)

const nome = (ins?.nome || "ALTRO").toUpperCase()

if(!insegnantiAggregati[nome]){
insegnantiAggregati[nome]=0
}

insegnantiAggregati[nome]+=costo

})
const nomiInsegnanti = Object.keys(insegnantiAggregati)

/* =========================
MESE
========================= */

const mesiItaliani=[
"GENNAIO","FEBBRAIO","MARZO","APRILE","MAGGIO","GIUGNO",
"LUGLIO","AGOSTO","SETTEMBRE","OTTOBRE","NOVEMBRE","DICEMBRE"
]

const [anno,meseNumero]=mese.split("-")
const meseTitolo = mesiItaliani[Number(meseNumero)-1]+" "+anno

/* =========================
PDF
========================= */

const pdfDoc = await PDFDocument.create()

const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

const margin = 50
const rowHeight = 18
const sectionSpacing = 30

let page = pdfDoc.addPage([842,595])
let y = 540

function newPage(){
page = pdfDoc.addPage([842,595])
y = 540
}

function ensureSpace(rows:number){
const needed = rows * rowHeight + 40
if(y < needed) newPage()
}

function ensureTableSpace(rows:number){
const neededHeight = (rows * rowHeight) + 40
if(y < neededHeight){
newPage()
}
}

function drawHeader(title:string){

ensureSpace(2)

page.drawText(title,{
x:margin,
y,
size:14,
font:boldFont
})

y -= 20
}

function getColor(v:number){
if(v>0) return rgb(0,0.6,0)
if(v<0) return rgb(0.8,0,0)
return rgb(0,0,0)
}

/* =========================
TABELLE
========================= */

function drawTableHeader(cols:any,startX:number){

let x=startX

cols.forEach(c=>{

page.drawRectangle({
x,
y:y-rowHeight+4,
width:c.width,
height:rowHeight,
color:rgb(0.92,0.92,0.92),
borderWidth:1,
borderColor:rgb(0.7,0.7,0.7)
})

page.drawText(c.label,{
x:x+4,
y:y-12,
size:c.width < 80 ? 8 : 9,
font:boldFont
})

x+=c.width

})

y-=rowHeight
}

function drawRow(cols:any,values:any,startX:number,colors:any=[]){

if(y < margin){

newPage()
drawTableHeader(cols,startX)

}

let x=startX

cols.forEach((c,i)=>{

page.drawRectangle({
x,
y:y-rowHeight+4,
width:c.width,
height:rowHeight,
color:rgb(1,1,1),
borderWidth:1,
borderColor:rgb(0.8,0.8,0.8)
})

const cellColor =
colors && colors[i] ? colors[i] : rgb(0,0,0)

let text = String(values[i] ?? "")

const maxChars = Math.floor((c.width-10)/4)

if(text.length > maxChars){
text = text.substring(0,maxChars-1) + "…"
}

let fontSize = 9
if(c.width < 80) fontSize = 8
if(c.width < 60) fontSize = 7

page.drawText(text,{
x:x+4,
y:y-12,
size:fontSize,
font,
color:cellColor
})

x+=c.width

})

y-=rowHeight

}
  /* =========================
LOGO
========================= */

try{

const logoUrl = new URL("/LOGO_DEFINITIVO_TRASPARENTE.png",request.url)
const logoBytes = await fetch(logoUrl).then(res=>res.arrayBuffer())
const logoImage = await pdfDoc.embedPng(logoBytes)

page.drawImage(logoImage,{
x:720,
y:460,
width:90,
height:90
})

}catch{}

/* =========================
HEADER
========================= */

page.drawText("HIP HOP FAMILY MANAGER",{x:margin,y,size:18,font:boldFont})
y -= 22

page.drawText("REPORT AMMINISTRATIVO",{x:margin,y,size:12,font:boldFont})
y -= 18

page.drawText(meseTitolo,{x:margin,y,size:12,font:boldFont})

y -= sectionSpacing

/* =========================
SITUAZIONE DEL MESE
========================= */

drawHeader("SITUAZIONE DEL MESE")

const totaleVersamenti =
versamentiSoci?.reduce((a,v)=>a+Number(v.importo),0) || 0

const differenzaDaRipartire =
totaleSpese - spesePagateCassa - spesePagateBanca

const differenzaFinale =
totaleVersamenti - differenzaDaRipartire

const situazioneCols=[
{label:"VOCE",width:450},
{label:"IMPORTO",width:150}
]

drawTableHeader(situazioneCols,margin)

drawRow(situazioneCols,["Totale Costi",`${totaleSpese.toFixed(2)} €`],margin,[undefined,getColor(-totaleSpese)])
drawRow(situazioneCols,["Incassi Corsi",`${totaleIncassi.toFixed(2)} €`],margin,[undefined,getColor(totaleIncassi)])
drawRow(situazioneCols,["Saldo Cassa",`${saldoInizialeCassa.toFixed(2)} €`],margin,[undefined,getColor(saldoInizialeCassa)])
drawRow(situazioneCols,["Saldo Banca",`${saldoInizialeBanca.toFixed(2)} €`],margin,[undefined,getColor(saldoInizialeBanca)])
drawRow(
situazioneCols,
["Differenza da Ripartire",`${differenzaDaRipartire.toFixed(2)} €`],
margin,
[undefined,getColor(-differenzaDaRipartire)]
)

drawRow(
situazioneCols,
["Versamenti Soci",`${totaleVersamenti.toFixed(2)} €`],
margin,
[undefined,getColor(totaleVersamenti)]
)

drawRow(
situazioneCols,
["Differenza Finale",`${differenzaFinale.toFixed(2)} €`],
margin,
[undefined,getColor(differenzaFinale)]
)
y -= sectionSpacing

/* =========================
RIEPILOGO CONTABILE
========================= */

drawHeader("RIEPILOGO CONTABILE")

const riepilogoCols=[
{label:"VOCE",width:450},
{label:"IMPORTO",width:150}
]

drawTableHeader(riepilogoCols,margin)

drawRow(
riepilogoCols,
["Totale Incassi",`${totaleIncassi.toFixed(2)} €`],
margin,
[undefined,getColor(totaleIncassi)]
)

drawRow(
riepilogoCols,
["Totale Spese",`${totaleSpese.toFixed(2)} €`],
margin,
[undefined,getColor(-totaleSpese)]
)

y -= sectionSpacing

/* =========================
DETTAGLIO INCASSI
========================= */

ensureTableSpace(incassi.length + 2)

drawHeader("DETTAGLIO INCASSI")

const incassiCols=[
{label:"DESCRIZIONE",width:450},
{label:"IMPORTO",width:150}
]

drawTableHeader(incassiCols,margin)

incassi.forEach(i=>{

drawRow(
incassiCols,
[
i.descrizione || "-",
`${Number(i.importo).toFixed(2)} €`
],
margin,
[undefined,rgb(0,0.6,0)]
)

})

y -= sectionSpacing

/* =========================
DETTAGLIO SPESE
========================= */

ensureTableSpace(spese.length + 2)

drawHeader("DETTAGLIO SPESE")

const speseCols=[
{label:"DESCRIZIONE",width:450},
{label:"IMPORTO",width:150}
]

drawTableHeader(speseCols,margin)

spese.forEach(s=>{

drawRow(
speseCols,
[
s.descrizione || "-",
`${Math.abs(Number(s.importo)).toFixed(2)} €`
],
margin,
[undefined,rgb(0.8,0,0)]
)

})

y -= sectionSpacing

/* =========================
RIPARTIZIONE COSTI SOCI
========================= */

ensureTableSpace((soci?.length || 0) + 2)

drawHeader("RIPARTIZIONE COSTI SOCI")

const pageWidth = 842
const usableWidth = pageWidth - (margin * 2)

const socioWidth = 140
const quotaWidth = 120
const dovutoWidth = 140

const fixedWidth =
socioWidth + quotaWidth + dovutoWidth

const remainingWidth =
usableWidth - fixedWidth

const insegnanteWidth =
Math.max(
60,
remainingWidth / Math.max(1, nomiInsegnanti.length)
)

const sociCols = [
{label:"SOCIO",width:socioWidth},
...nomiInsegnanti.map(n=>({label:n,width:insegnanteWidth})),
{label:"QUOTA DISP.",width:quotaWidth},
{label:"IMPORTO DA VERSARE",width:dovutoWidth}
]

drawTableHeader(sociCols,margin)

soci?.forEach(s=>{

const perc = Number(s.quota_percentuale)/100

const quotaDisponibile =
saldoInizialeCassa * perc

let totaleCosti = 0

const valori:any = [s.nome]
const colori:any = [undefined]

nomiInsegnanti.forEach(nome=>{

const quota = insegnantiAggregati[nome] * perc
totaleCosti += quota

valori.push(`${(-quota).toFixed(2)} €`)
colori.push(rgb(0.8,0,0))

})

valori.push(`${quotaDisponibile.toFixed(2)} €`)
colori.push(rgb(0,0.6,0))

const dovuto = Math.max(0, totaleCosti - quotaDisponibile)

valori.push(`${dovuto.toFixed(2)} €`)
colori.push(getColor(-dovuto))

drawRow(sociCols,valori,margin,colori)

})

y -= sectionSpacing

/* =========================
VERSAMENTI SOCI
========================= */

ensureTableSpace((soci?.length || 0) + 2)

drawHeader("VERSAMENTI SOCI")

const versCols=[
{label:"SOCIO",width:350},
{label:"VERSATO",width:200}
]

drawTableHeader(versCols,margin)

soci?.forEach(s=>{

const versato =
versamentiSoci
?.filter(v=>v.socio_id===s.id)
.reduce((a,v)=>a+Number(v.importo),0) || 0

drawRow(
versCols,
[
s.nome,
`${versato.toFixed(2)} €`
],
margin,
[undefined,getColor(versato)]
)

})

y -= sectionSpacing

/* =========================
GESTIONE AFFITTO
========================= */

ensureTableSpace((soci?.length || 0) + 2)

drawHeader("GESTIONE AFFITTO")

const affittoCols=[
{label:"SOCIO",width:250},
{label:"QUOTA",width:150},
{label:"VERSATO",width:150},
{label:"SALDO",width:150}
]

drawTableHeader(affittoCols,margin)

soci?.forEach(s=>{

const quota = costoAffittoTotale*(Number(s.quota_percentuale)/100)

const versato =
affittoPagamenti
?.filter(p=>p.socio_id===s.id)
.reduce((a,p)=>a+Number(p.importo),0) || 0

const saldo = quota - versato

drawRow(
affittoCols,
[
s.nome,
`${quota.toFixed(2)} €`,
`${versato.toFixed(2)} €`,
`${saldo.toFixed(2)} €`
],
margin,
[
undefined,
undefined,
rgb(0,0.6,0),
getColor(-saldo)
]
)

})

const pdfBytes = await pdfDoc.save()

return new NextResponse(Buffer.from(pdfBytes),{
headers:{
"Content-Type":"application/pdf",
"Content-Disposition":`inline; filename=report_${mese}.pdf`
}
})

}
