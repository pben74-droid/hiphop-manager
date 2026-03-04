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

const versamentiAffitto = movimenti?.filter(
m => m.tipo==="versamento_affitto"
) || []

const pagamentiAffitto = movimenti?.filter(
m => m.tipo==="pagamento_affitto"
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
PDF SETUP
========================= */

const pdfDoc = await PDFDocument.create()

const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

const margin = 50
const pageWidth = 595
const rowHeight = 18

let page = pdfDoc.addPage([595,842])
let y = 800

function newPage(){
page = pdfDoc.addPage([595,842])
y = 800
}

function checkPage(){
if(y < 100) newPage()
}

function drawHeader(title:string){

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
color:rgb(0.9,0.9,0.9)
})

page.drawRectangle({
x,
y:y-rowHeight+4,
width:c.width,
height:rowHeight,
borderWidth:1
})

page.drawText(c.label,{
x:x+4,
y:y-12,
size:9,
font:boldFont
})

x+=c.width

})

y-=rowHeight
}

function drawRow(cols:any[],values:any[],startX:number,colors:any[]=[]){

let x=startX

cols.forEach((c,i)=>{

page.drawRectangle({
x,
y:y-rowHeight+4,
width:c.width,
height:rowHeight,
borderWidth:1
})

const cellColor =
colors && colors[i] ? colors[i] : rgb(0,0,0)

page.drawText(values[i],{
x:x+4,
y:y-12,
size:9,
font,
color:cellColor
})

x+=c.width

})

y-=rowHeight

checkPage()

}

/* =========================
LOGO
========================= */

try{

const logoUrl = new URL("/LOGO_DEFINITIVO_TRASPARENTE.png",request.url)

const logoBytes = await fetch(logoUrl).then(res=>res.arrayBuffer())

const logoImage = await pdfDoc.embedPng(logoBytes)

page.drawImage(logoImage,{
x:pageWidth-140,
y:720,
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
RIEPILOGO
========================= */

drawHeader("RIEPILOGO CONTABILE")

const riepilogoCols=[
{label:"VOCE",width:350},
{label:"IMPORTO",width:120}
]

drawTableHeader(riepilogoCols,margin)

drawRow(riepilogoCols,
["Totale Incassi",`${totaleIncassi.toFixed(2)} €`],
margin,
[null,getColor(totaleIncassi)]
)

drawRow(riepilogoCols,
["Totale Spese",`${totaleSpese.toFixed(2)} €`],
margin,
[null,getColor(-totaleSpese)]
)

/* =========================
INCASSI
========================= */

y -= 30

drawHeader("DETTAGLIO INCASSI")

const incassiCols=[
{label:"DESCRIZIONE",width:350},
{label:"IMPORTO",width:120}
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
[null,rgb(0,0.6,0)]
)

})

/* =========================
SPESE
========================= */

y -= 30

drawHeader("DETTAGLIO SPESE")

const speseCols=[
{label:"DESCRIZIONE",width:350},
{label:"IMPORTO",width:120}
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
[null,rgb(0.8,0,0)]
)

})

/* =========================
VERSAMENTI SOCI
========================= */

y -= 30

drawHeader("VERSAMENTI SOCI")

const versCols=[
{label:"SOCIO",width:250},
{label:"VERSATO",width:150}
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
[null,getColor(versato)]
)

})

/* =========================
AFFITTO
========================= */

y -= 30

drawHeader("GESTIONE AFFITTO")

const affittoCols=[
{label:"SOCIO",width:180},
{label:"QUOTA",width:100},
{label:"VERSATO",width:100},
{label:"SALDO",width:100}
]

drawTableHeader(affittoCols,margin)

const costoAffittoTotale =
pagamentiAffitto.reduce((a,p)=>a+Math.abs(Number(p.importo)),0)

soci?.forEach(s=>{

const quota = costoAffittoTotale*(Number(s.quota_percentuale)/100)

const versato =
versamentiAffitto
.filter(v=>v.socio_id===s.id)
.reduce((a,v)=>a+Number(v.importo),0)

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
null,
null,
rgb(0,0.6,0),
getColor(-saldo)
]
)

})

/* =========================
PDF
========================= */

const pdfBytes = await pdfDoc.save()

return new NextResponse(Buffer.from(pdfBytes),{
headers:{
"Content-Type":"application/pdf",
"Content-Disposition":`inline; filename=report_${mese}.pdf`
}
})

}
