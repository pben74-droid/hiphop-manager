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

/* DATI BASE */

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

/* MOVIMENTI */

const incassi = movimenti?.filter(
m=>m.tipo==="incasso" &&
m.categoria!=="trasferimento" &&
m.categoria!=="versamento_socio"
) || []

const spese = movimenti?.filter(
m=>m.tipo==="spesa"
) || []

const insegnantiRaw = movimenti?.filter(
m=>m.categoria==="insegnante"
) || []

const versamentiAffitto = movimenti?.filter(
m=>m.tipo==="versamento_affitto"
) || []

const pagamentiAffitto = movimenti?.filter(
m=>m.tipo==="pagamento_affitto"
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

/* INSEGNANTI */

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

/* MESE */

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

function newLine(space=16){y-=space}

function newPage(){
page = pdfDoc.addPage([595,842])
y=800
}

function getColor(v:number){
if(v>0) return rgb(0,0.6,0)
if(v<0) return rgb(0.8,0,0)
return rgb(0,0,0)
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

function row(label,value){

page.drawText(label,{x:margin,y,size:10,font})

page.drawText(
`${value.toFixed(2)} €`,
{
x:450,
y,
size:10,
font,
color:getColor(value)
})

newLine()

}

row("Totale Incassi",totaleIncassi)
row("Totale Spese",-totaleSpese)
row("Cassa mese precedente",saldoInizialeCassa)
row("Saldo Cassa Finale",saldoCassaFinale)
row("Saldo Banca Finale",saldoBancaFinale)

newLine(30)

/* INCASSI */

page.drawText("DETTAGLIO INCASSI",{x:margin,y,size:14,font:boldFont})
newLine(20)

incassi.forEach(i=>{

page.drawText(i.descrizione || "-",{x:margin,y,size:10,font})

page.drawText(
`${Number(i.importo).toFixed(2)} €`,
{
x:450,
y,
size:10,
font,
color:rgb(0,0.6,0)
})

newLine()

})

newLine(20)

/* SPESE */

page.drawText("DETTAGLIO SPESE",{x:margin,y,size:14,font:boldFont})
newLine(20)

spese.forEach(s=>{

page.drawText(s.descrizione || "-",{x:margin,y,size:10,font})

page.drawText(
`${Math.abs(Number(s.importo)).toFixed(2)} €`,
{
x:450,
y,
size:10,
font,
color:rgb(0.8,0,0)
})

newLine()

})

newLine(30)

/* RIPARTIZIONE SOCI */

page.drawText("RIPARTIZIONE COSTI SOCI",{x:margin,y,size:14,font:boldFont})
newLine(20)

soci?.forEach(s=>{

const perc = Number(s.quota_percentuale)/100

const quotaDisponibile =
(totaleIncassi + saldoInizialeCassa) * perc

let totaleCosti=0

nomiInsegnanti.forEach(nome=>{
totaleCosti+=insegnantiAggregati[nome]*perc
})

const dovuto = totaleCosti - quotaDisponibile

page.drawText(s.nome,{x:margin,y,size:10,font})

page.drawText(
`${quotaDisponibile.toFixed(2)} €`,
{
x:300,
y,
size:10,
font,
color:rgb(0,0.6,0)
})

page.drawText(
`${dovuto.toFixed(2)} €`,
{
x:450,
y,
size:10,
font,
color:rgb(0.8,0,0)
})

newLine()

})

newLine(30)

/* VERSAMENTI SOCI */

page.drawText("VERSAMENTI SOCI",{x:margin,y,size:14,font:boldFont})
newLine(20)

soci?.forEach(s=>{

const versato =
versamentiSoci
?.filter(v=>v.socio_id===s.id)
.reduce((a,v)=>a+Number(v.importo),0) || 0

page.drawText(s.nome,{x:margin,y,size:10,font})

page.drawText(
`${versato.toFixed(2)} €`,
{
x:450,
y,
size:10,
font,
color:getColor(versato)
})

newLine()

})

newLine(30)

/* AFFITTO */

page.drawText("GESTIONE AFFITTO",{x:margin,y,size:14,font:boldFont})
newLine(20)

const costoAffittoTotale =
pagamentiAffitto.reduce((a,p)=>a+Math.abs(Number(p.importo)),0)

soci?.forEach(s=>{

const quota = costoAffittoTotale * (Number(s.quota_percentuale)/100)

const versato =
versamentiAffitto
.filter(v=>v.socio_id===s.id)
.reduce((a,v)=>a+Number(v.importo),0)

const saldo = quota - versato

page.drawText(s.nome,{x:margin,y,size:10,font})

page.drawText(
`${quota.toFixed(2)} €`,
{x:250,y,size:10,font}
)

page.drawText(
`${versato.toFixed(2)} €`,
{x:360,y,size:10,font,color:rgb(0,0.6,0)}
)

page.drawText(
`${saldo.toFixed(2)} €`,
{x:450,y,size:10,font,color:getColor(-saldo)}
)

newLine()

})

const pdfBytes = await pdfDoc.save()

return new NextResponse(Buffer.from(pdfBytes),{
headers:{
"Content-Type":"application/pdf",
"Content-Disposition":`inline; filename=report_${mese}.pdf`
}
})

}
