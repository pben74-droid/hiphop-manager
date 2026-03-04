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

const pagamentoAffitto = movimenti?.filter(
m => m.tipo==="pagamento_affitto"
) || []

/* TOTALI */

const totaleIncassi = incassi.reduce((a,m)=>a+Number(m.importo),0)
const totaleSpese = spese.reduce((a,m)=>a+Math.abs(Number(m.importo)),0)

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

let nome = (m.descrizione || "").toUpperCase()

nome = nome
.replace("COMPENSO","")
.replace("INSEGNANTE","")
.trim()

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

const newLine=(space=16)=>{y-=space}

const newPage=()=>{
page=pdfDoc.addPage([595,842])
y=800
}

const checkSpace=(space:number)=>{
if(y-space<80) newPage()
}

const drawText=(text:string,x:number,size=10,bold=false,color=rgb(0,0,0))=>{
page.drawText(text,{x,y,size,font:bold?boldFont:font,color})
}

const drawRight=(value:number,bold=false,color?:any)=>{

const text=`${value.toFixed(2)} €`

const width = bold
? boldFont.widthOfTextAtSize(text,10)
: font.widthOfTextAtSize(text,10)

page.drawText(text,{
x:pageWidth-margin-width,
y,
size:10,
font:bold?boldFont:font,
color:color?color:rgb(0,0,0)
})

}

const drawLine=()=>{
page.drawLine({
start:{x:margin,y},
end:{x:pageWidth-margin,y},
thickness:0.5,
color:rgb(0.7,0.7,0.7)
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
newLine(20)

drawText("Totale Incassi",margin)
drawRight(totaleIncassi,true)
newLine()

drawText("Totale Spese",margin)
drawRight(-totaleSpese,true)
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

/* RIPARTIZIONE SOCI */

drawText("RIPARTIZIONE COSTI SOCI",margin,14,true)
newLine(20)

const colWidth=55
const colStart=margin

drawText("SOCIO",colStart,10,true)

nomiInsegnanti.forEach((nome,i)=>{
drawText(nome,colStart+colWidth*(i+1),9,true)
})

const quotaCol = colStart+colWidth*(nomiInsegnanti.length+1)
const dovutoCol = quotaCol+80

drawText("QUOTA DISP.",quotaCol,9,true)
drawText("IMPORTO DA VERSARE",dovutoCol,9,true)

newLine(12)
drawLine()
newLine(8)

soci?.forEach(s=>{

checkSpace(20)

const perc = Number(s.quota_percentuale)/100

const quotaDisponibile =
(totaleIncassi + saldoInizialeCassa) * perc

let totaleCosti=0

drawText(s.nome,colStart)

nomiInsegnanti.forEach((nome,i)=>{

const quota = insegnantiAggregati[nome]*perc
totaleCosti+=quota

page.drawText(`${(-quota).toFixed(2)} €`,{
x:colStart+colWidth*(i+1),
y,
size:9,
font
})

})

page.drawText(`${quotaDisponibile.toFixed(2)} €`,{
x:quotaCol,
y,
size:9,
font
})

const dovuto = Math.max(0,totaleCosti - quotaDisponibile)

page.drawText(`${dovuto.toFixed(2)} €`,{
x:dovutoCol,
y,
size:9,
font,
color:rgb(0.8,0,0)
})

newLine(16)
drawLine()
newLine(6)

})

newLine(30)

/* AFFITTO */

drawText("GESTIONE AFFITTO",margin,14,true)
newLine(20)

versamentiAffitto.forEach(v=>{

drawText("Versamento Affitto",margin)
drawRight(Number(v.importo))
newLine()

})

pagamentoAffitto.forEach(p=>{

drawText("Pagamento Affitto",margin)
drawRight(-Math.abs(Number(p.importo)))
newLine()

})

drawText("Saldo Affitto",margin)
drawRight(saldoAffitto,true)

const pdfBytes = await pdfDoc.save()

return new NextResponse(Buffer.from(pdfBytes),{
headers:{
"Content-Type":"application/pdf",
"Content-Disposition":`inline; filename=report_${mese}.pdf`
}
})

}
