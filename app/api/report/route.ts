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

/* DATI */

const { data:movimenti } = await supabase
.from("movimenti_finanziari")
.select("*")
.eq("mese",mese)

const { data:soci } = await supabase
.from("soci")
.select("*")

const { data:meseData } = await supabase
.from("mesi")
.select("saldo_iniziale_cassa,saldo_iniziale_banca")
.eq("mese",mese)
.maybeSingle()

const saldoInizialeCassa = Number(meseData?.saldo_iniziale_cassa) || 0
const saldoInizialeBanca = Number(meseData?.saldo_iniziale_banca) || 0

/* MOVIMENTI */

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

/* TOTALI */

const totaleIncassi = incassi.reduce((a,m)=>a+Number(m.importo),0)
const totaleSpese = spese.reduce((a,m)=>a+Math.abs(Number(m.importo)),0)

/* SALDI */

const saldoCassaFinale =
saldoInizialeCassa +
(movimenti?.filter(m=>m.contenitore==="cassa_operativa")
.reduce((a,m)=>a+Number(m.importo),0) || 0)

const saldoBancaFinale =
saldoInizialeBanca +
(movimenti?.filter(m=>m.contenitore==="banca")
.reduce((a,m)=>a+Number(m.importo),0) || 0)

const saldoAffitto =
(movimenti?.filter(m=>m.contenitore==="cassa_affitto")
.reduce((a,m)=>a+Number(m.importo),0) || 0)

/* INSEGNANTI */

const insegnantiAggregati:Record<string,number> = {}

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

/* MESE ITALIANO */

const mesiItaliani=[
"GENNAIO","FEBBRAIO","MARZO","APRILE","MAGGIO","GIUGNO",
"LUGLIO","AGOSTO","SETTEMBRE","OTTOBRE","NOVEMBRE","DICEMBRE"
]

const [anno,meseNumero]=mese.split("-")
const meseTitolo = mesiItaliani[Number(meseNumero)-1]+" "+anno

/* PDF */

const pdfDoc = await PDFDocument.create()

const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

const margin=50
const pageWidth=595

let page = pdfDoc.addPage([595,842])
let y=800

const rowHeight=18

function newLine(space=16){y-=space}

function newPage(){
page = pdfDoc.addPage([595,842])
y=800
}

function checkSpace(space){
if(y-space<80) newPage()
}

function getColor(v){
if(v>0) return rgb(0,0.6,0)
if(v<0) return rgb(0.8,0,0)
return rgb(0,0,0)
}

/* TABELLE */

function drawTableHeader(columns,startX){

let x=startX

columns.forEach(col=>{

page.drawRectangle({
x,
y:y-rowHeight+4,
width:col.width,
height:rowHeight,
color:rgb(0.92,0.92,0.92)
})

page.drawRectangle({
x,
y:y-rowHeight+4,
width:col.width,
height:rowHeight,
borderWidth:1,
borderColor:rgb(0.6,0.6,0.6)
})

page.drawText(col.label,{
x:x+4,
y:y-12,
size:9,
font:boldFont
})

x+=col.width

})

y-=rowHeight
}

function drawTableRow(columns,values,startX){

let x=startX

columns.forEach((col,i)=>{

page.drawRectangle({
x,
y:y-rowHeight+4,
width:col.width,
height:rowHeight,
borderWidth:1,
borderColor:rgb(0.8,0.8,0.8)
})

const value = values[i]

page.drawText(value,{
x:x+4,
y:y-12,
size:9,
font
})

x+=col.width

})

y-=rowHeight
}

/* LOGO */

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

/* HEADER */

page.drawText("HIP HOP FAMILY MANAGER",{x:margin,y,size:18,font:boldFont})
newLine(22)

page.drawText("REPORT AMMINISTRATIVO",{x:margin,y,size:12,font:boldFont})
newLine(16)

page.drawText(meseTitolo,{x:margin,y,size:12,font:boldFont})

newLine(30)

/* RIEPILOGO */

page.drawText("RIEPILOGO CONTABILE",{x:margin,y,size:14,font:boldFont})
newLine(20)

page.drawText(`Totale Incassi`,{x:margin,y,size:10,font})
page.drawText(`${totaleIncassi.toFixed(2)} €`,{x:450,y,size:10,font,color:getColor(totaleIncassi)})
newLine()

page.drawText(`Totale Spese`,{x:margin,y,size:10,font})
page.drawText(`${totaleSpese.toFixed(2)} €`,{x:450,y,size:10,font,color:getColor(-totaleSpese)})
newLine()

page.drawText(`Cassa mese precedente`,{x:margin,y,size:10,font})
page.drawText(`${saldoInizialeCassa.toFixed(2)} €`,{x:450,y,size:10,font})
newLine()

page.drawText(`Saldo Cassa Finale`,{x:margin,y,size:10,font})
page.drawText(`${saldoCassaFinale.toFixed(2)} €`,{x:450,y,size:10,font})
newLine()

page.drawText(`Saldo Banca Finale`,{x:margin,y,size:10,font})
page.drawText(`${saldoBancaFinale.toFixed(2)} €`,{x:450,y,size:10,font})

newLine(30)

/* DETTAGLIO INCASSI */

page.drawText("DETTAGLIO INCASSI",{x:margin,y,size:14,font:boldFont})
newLine(20)

const incassiColumns=[
{label:"DESCRIZIONE",width:350},
{label:"IMPORTO",width:120}
]

drawTableHeader(incassiColumns,margin)

incassi.forEach(i=>{
drawTableRow(
incassiColumns,
[
i.descrizione || "-",
`${Number(i.importo).toFixed(2)} €`
],
margin
)
})

newLine(30)

/* DETTAGLIO SPESE */

page.drawText("DETTAGLIO SPESE",{x:margin,y,size:14,font:boldFont})
newLine(20)

const speseColumns=[
{label:"DESCRIZIONE",width:350},
{label:"IMPORTO",width:120}
]

drawTableHeader(speseColumns,margin)

spese.forEach(s=>{
drawTableRow(
speseColumns,
[
s.descrizione || "-",
`${Math.abs(Number(s.importo)).toFixed(2)} €`
],
margin
)
})

newLine(30)

/* RIPARTIZIONE SOCI */

page.drawText("RIPARTIZIONE COSTI SOCI",{x:margin,y,size:14,font:boldFont})
newLine(20)

const sociColumns=[
{label:"SOCIO",width:120},
...nomiInsegnanti.map(n=>({label:n,width:60})),
{label:"QUOTA DISP.",width:100},
{label:"IMPORTO DA VERSARE",width:140}
]

drawTableHeader(sociColumns,margin)

soci?.forEach(s=>{

const perc = Number(s.quota_percentuale)/100

const quotaDisponibile =
(totaleIncassi + saldoInizialeCassa) * perc

let totaleCosti=0

const valori=[s.nome]

nomiInsegnanti.forEach(nome=>{

const quota = insegnantiAggregati[nome]*perc
totaleCosti+=quota

valori.push(`${(-quota).toFixed(2)} €`)

})

valori.push(`${quotaDisponibile.toFixed(2)} €`)

const dovuto=Math.max(0,totaleCosti-quotaDisponibile)

valori.push(`${dovuto.toFixed(2)} €`)

drawTableRow(sociColumns,valori,margin)

})

newLine(30)

/* AFFITTO */

page.drawText("GESTIONE AFFITTO",{x:margin,y,size:14,font:boldFont})
newLine(20)

const affittoColumns=[
{label:"SOCIO",width:200},
{label:"QUOTA AFFITTO",width:120},
{label:"VERSATO",width:120},
{label:"SALDO",width:120}
]

drawTableHeader(affittoColumns,margin)

const costoAffittoTotale =
pagamentiAffitto.reduce((a,p)=>a+Math.abs(Number(p.importo)),0)

soci?.forEach(s=>{

const quota = costoAffittoTotale * (Number(s.quota_percentuale)/100)

const versato =
versamentiAffitto
.filter(v=>v.socio_id===s.id)
.reduce((a,v)=>a+Number(v.importo),0)

const saldo = quota - versato

drawTableRow(
affittoColumns,
[
s.nome,
`${quota.toFixed(2)} €`,
`${versato.toFixed(2)} €`,
`${saldo.toFixed(2)} €`
],
margin
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
