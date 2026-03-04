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

const { data:versamenti } = await supabase
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

/* FILTRI */

const incassi = movimenti?.filter(
m => m.tipo === "incasso" &&
m.categoria !== "trasferimento" &&
m.categoria !== "versamento_socio"
) || []

const spese = movimenti?.filter(
m => m.tipo === "spesa"
) || []

const insegnantiRaw = movimenti?.filter(
m => m.categoria === "insegnante"
) || []

const totaleIncassi = incassi.reduce((a,m)=>a+Number(m.importo),0)
const totaleSpese = spese.reduce((a,m)=>a+Math.abs(Number(m.importo)),0)

const perdita = totaleSpese > totaleIncassi
? totaleSpese - totaleIncassi
: 0

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

const insegnantiAggregati:Record<string,number> = {}

insegnantiRaw.forEach(m=>{

let nome = (m.descrizione || "").toUpperCase()

nome = nome
.replace("COMPENSO","")
.replace("INSEGNANTE","")
.trim()

if(!nome) nome = "ALTRO"

if(!insegnantiAggregati[nome]){
insegnantiAggregati[nome] = 0
}

insegnantiAggregati[nome] += Math.abs(Number(m.importo))

})

const nomiInsegnanti = Object.keys(insegnantiAggregati)

/* MESE ITALIANO */

const mesiItaliani = [
"GENNAIO","FEBBRAIO","MARZO","APRILE","MAGGIO","GIUGNO",
"LUGLIO","AGOSTO","SETTEMBRE","OTTOBRE","NOVEMBRE","DICEMBRE"
]

const [anno,meseNumero] = mese.split("-")
const meseTitolo = mesiItaliani[Number(meseNumero)-1] + " " + anno

/* PDF */

const pdfDoc = await PDFDocument.create()

const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

const margin = 50
const pageWidth = 595

let page = pdfDoc.addPage([595,842])
let y = 800

const newLine = (space=16)=>{y -= space}

const newPage = ()=>{
page = pdfDoc.addPage([595,842])
y = 800
}

const checkSpace = (needed:number)=>{
if(y - needed < 80) newPage()
}

const getColor = (v:number)=>{
if(v>0) return rgb(0,0.6,0)
if(v<0) return rgb(0.8,0,0)
return rgb(0,0,0)
}

const drawText=(text:string,x:number,size=10,bold=false,color=rgb(0,0,0))=>{
page.drawText(text,{
x,
y,
size,
font:bold?boldFont:font,
color
})
}

const drawRight=(value:number,bold=false)=>{

const text = `${value.toFixed(2)} €`

const width = bold
? boldFont.widthOfTextAtSize(text,10)
: font.widthOfTextAtSize(text,10)

page.drawText(text,{
x:pageWidth-margin-width,
y,
size:10,
font:bold?boldFont:font,
color:getColor(value)
})

}

const drawLine=(thickness=0.6)=>{

page.drawLine({
start:{x:margin,y},
end:{x:pageWidth-margin,y},
thickness,
color:rgb(0.75,0.75,0.75)
})

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

drawText("HIP HOP FAMILY MANAGER",margin,18,true)
newLine(22)

drawText("REPORT AMMINISTRATIVO",margin,12,true)
newLine(18)

drawText(meseTitolo,margin,12,true)

newLine(30)

/* RIEPILOGO */

drawText("RIEPILOGO CONTABILE",margin,14,true)
newLine(18)
drawLine()
newLine(12)

drawText("Totale Incassi",margin)
drawRight(totaleIncassi,true)
newLine()

drawText("Totale Spese",margin)
drawRight(-totaleSpese,true)
newLine()

drawText("Totale costi da ripartire",margin)
drawRight(-perdita,true)
newLine()

drawText("Cassa mese precedente",margin)
drawRight(saldoInizialeCassa,true)
newLine()

drawText("Saldo Cassa Finale",margin)
drawRight(saldoCassaFinale,true)
newLine()

drawText("Saldo Banca Finale",margin)
drawRight(saldoBancaFinale,true)

newLine(30)

/* DETTAGLIO INCASSI */

drawText("DETTAGLIO INCASSI",margin,14,true)
newLine(18)
drawLine()
newLine(10)

incassi.forEach(i=>{

checkSpace(20)

drawText(i.descrizione || "-",margin)
drawRight(Number(i.importo))

newLine(14)
drawLine()
newLine(6)

})

newLine(30)

/* DETTAGLIO SPESE */

drawText("DETTAGLIO SPESE",margin,14,true)
newLine(18)
drawLine()
newLine(10)

spese.forEach(s=>{

checkSpace(20)

drawText(s.descrizione || "-",margin)
drawRight(-Math.abs(Number(s.importo)))

newLine(14)
drawLine()
newLine(6)

})

newLine(30)

/* RIPARTIZIONE COSTI SOCI */

drawText("RIPARTIZIONE COSTI SOCI",margin,14,true)
newLine(18)
drawLine()
newLine(10)

const colWidth = 55
const colStart = margin

drawText("SOCIO",colStart,10,true)

nomiInsegnanti.forEach((nome,i)=>{
drawText(nome,colStart + colWidth*(i+1),9,true)
})

const quotaCol = colStart + colWidth*(nomiInsegnanti.length+1)
const dovutoCol = quotaCol + 80

drawText("QUOTA DISP.",quotaCol,9,true)
drawText("IMPORTO DA VERSARE",dovutoCol,9,true)

newLine(12)
drawLine()
newLine(8)

const debitiSoci:any[] = []

soci?.forEach(s=>{

checkSpace(20)

const perc = Number(s.quota_percentuale)/100

const quotaIncassi = totaleIncassi * perc

const creditoSocio =
versamenti
?.filter(v=>v.socio_id===s.id)
.reduce((a,v)=>a+Number(v.importo),0) || 0

const quotaDisponibile =
quotaIncassi + creditoSocio

let totaleCosti = 0

drawText(s.nome,colStart)

nomiInsegnanti.forEach((nome,i)=>{

const quota = insegnantiAggregati[nome]*perc
totaleCosti += quota

page.drawText(`${(-quota).toFixed(2)} €`,{
x:colStart + colWidth*(i+1),
y,
size:9,
font,
color:getColor(-quota)
})

})

page.drawText(`${quotaDisponibile.toFixed(2)} €`,{
x:quotaCol,
y,
size:9,
font,
color:getColor(quotaDisponibile)
})

const dovuto = Math.max(0,totaleCosti - quotaDisponibile)

page.drawText(`${dovuto.toFixed(2)} €`,{
x:dovutoCol,
y,
size:9,
font,
color:getColor(dovuto)
})

debitiSoci.push({
socio:s,
dovuto
})

newLine(16)
drawLine()
newLine(6)

})

newLine(30)

/* VERSAMENTI SOCI */

drawText("VERSAMENTI SOCI",margin,14,true)
newLine(18)
drawLine()
newLine(10)

drawText("SOCIO",margin,9,true)
drawText("TOTALE DA VERSARE",margin+170,9,true)
drawText("TOTALE VERSATO",margin+320,9,true)
drawText("CREDITO DISP.",margin+460,9,true)

newLine(12)
drawLine()
newLine(8)

debitiSoci.forEach(d=>{

checkSpace(20)

const socio = d.socio

const versato =
versamenti
?.filter(v=>v.socio_id===socio.id)
.reduce((a,v)=>a+Number(v.importo),0) || 0

const credito = versato - d.dovuto

drawText(socio.nome,margin)

page.drawText(`${d.dovuto.toFixed(2)} €`,{
x:margin+170,
y,
size:9,
font,
color:getColor(-d.dovuto)
})

page.drawText(`${versato.toFixed(2)} €`,{
x:margin+320,
y,
size:9,
font,
color:getColor(versato)
})

page.drawText(`${credito.toFixed(2)} €`,{
x:margin+460,
y,
size:9,
font,
color:getColor(credito)
})

newLine(16)
drawLine()
newLine(6)

})

/* NUMERO PAGINE */

const pages = pdfDoc.getPages()

pages.forEach((p,index)=>{

p.drawText(
`Pagina ${index+1} / ${pages.length}`,
{
x:pageWidth-120,
y:20,
size:9,
font
}
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
