import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

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

const { data:soci } = await supabase
.from("soci")
.select("*")

const { data:versamentiSoci } = await supabase
.from("versamenti_soci")
.select("*")
.eq("mese",mese)

const { data:meseData } = await supabase
.from("mesi")
.select("saldo_iniziale_cassa,saldo_iniziale_banca")
.eq("mese",mese)
.maybeSingle()

/* =========================
AFFITTO DATI
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

const saldoInizialeCassa = Number(meseData?.saldo_iniziale_cassa) || 0
const saldoInizialeBanca = Number(meseData?.saldo_iniziale_banca) || 0

/* =========================
MOVIMENTI
========================= */

const incassi = movimenti?.filter(
m => m.tipo==="incasso" &&
m.categoria!=="trasferimento" &&
m.categoria!=="versamento_socio"
) || []

const spese = movimenti?.filter(
m => m.tipo==="spesa"
) || []

const insegnantiRaw = movimenti?.filter(
m => m.categoria==="insegnante"
) || []

/* =========================
TOTALI
========================= */

const totaleIncassi = incassi.reduce((a,m)=>a+Number(m.importo),0)
const totaleSpese = spese.reduce((a,m)=>a+Math.abs(Number(m.importo)),0)

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

let page = pdfDoc.addPage([842,595])
let y = 540

function newPage(){
page = pdfDoc.addPage([842,595])
y = 540
}

function checkPage(){
if(y < 120) newPage()
}

function drawHeader(title:string){

checkPage()

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

if(y < 120){
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

y -= 30

/* =========================
SITUAZIONE DEL MESE
========================= */

drawHeader("SITUAZIONE DEL MESE")

const totaleVersamenti =
versamentiSoci?.reduce((a,v)=>a+Number(v.importo),0) || 0

const differenzaDaCoprire =
Math.max(0, totaleSpese - totaleIncassi - saldoInizialeCassa)

const residuoDaVersare =
Math.max(0, differenzaDaCoprire - totaleVersamenti)

const situazioneCols=[
{label:"VOCE",width:450},
{label:"IMPORTO",width:150}
]

drawTableHeader(situazioneCols,margin)

drawRow(situazioneCols,
["Totale Costi",`${totaleSpese.toFixed(2)} €`],
margin,
[undefined,getColor(-totaleSpese)]
)

drawRow(situazioneCols,
["Incassi Corsi",`${totaleIncassi.toFixed(2)} €`],
margin,
[undefined,getColor(totaleIncassi)]
)

drawRow(situazioneCols,
["Cassa Disponibile",`${saldoInizialeCassa.toFixed(2)} €`],
margin,
[undefined,getColor(saldoInizialeCassa)]
)

drawRow(situazioneCols,
["Differenza da Coprire",`${differenzaDaCoprire.toFixed(2)} €`],
margin,
[undefined,getColor(-differenzaDaCoprire)]
)

drawRow(situazioneCols,
["Versamenti Soci",`${totaleVersamenti.toFixed(2)} €`],
margin,
[undefined,getColor(totaleVersamenti)]
)

drawRow(situazioneCols,
["Residuo da Versare",`${residuoDaVersare.toFixed(2)} €`],
margin,
[undefined,getColor(-residuoDaVersare)]
)

/* =========================
RIEPILOGO
========================= */

drawHeader("RIEPILOGO CONTABILE")

const riepilogoCols=[
{label:"VOCE",width:450},
{label:"IMPORTO",width:150}
]

drawTableHeader(riepilogoCols,margin)

drawRow(riepilogoCols,
["Totale Incassi",`${totaleIncassi.toFixed(2)} €`],
margin,
[undefined,getColor(totaleIncassi)]
)

drawRow(riepilogoCols,
["Totale Spese",`${totaleSpese.toFixed(2)} €`],
margin,
[undefined,getColor(-totaleSpese)]
)
