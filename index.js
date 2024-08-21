const puppeteer = require("puppeteer") 
const path = require("path")
const fs = require("fs")
const csv = require('csv')
const axios = require("axios")


const urlExtractEstoque = "https://humble.enviando.nordware.io/products/export/?code=&gtin=&account=&description=&minimal_stock=&minimal_stock_date_gte=&minimal_stock_date_lte=&only_minimal_stock=&list_inactive_products="
const urlextractFalha = "https://humble.enviando.nordware.io/orders/import-fails/export/?order_erp=&store=&order_fail=&date_fail=&date_order="
const urlGooglefalha = "https://script.google.com/macros/s/AKfycbxg9mbeDRtdl3sMfCO7FGjHF9bawVwD17lNSOl-DAAgBKnUzXQd0GDt2ZP53b4xYierUA/exec"

async function extract_falha_pedido() {
    var filename = "./falhas-de-importacao.csv"
    if ( fs.existsSync(filename) ) {
        fs.unlinkSync(filename)
    }
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    await page.setViewport({width: 1366, height: 980})
    let url = 'https://humble.enviando.nordware.io/'

    await page.goto(url);
    page.waitForNavigation({ waitUntil: 'networkidle0' })

    await page.type('#login > div:nth-child(3) > div > input', 'brunodesenvolvedor');
    await page.type('#login > div:nth-child(4) > div > input', 'Bruno123@');
    
    await Promise.all([
        page.click('#login > div.form-group.text-center.m-t-30 > div > button'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    
    await page.$eval("#main-menu > li:nth-child(8) > a > i", element => element.click())
    await page.$eval("#main-menu > li:nth-child(8) > ul > li:nth-child(6) > a", element => element.click())
   
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: __dirname,
    });
    // colocado dentro do try porque estava quebrando a aplicação
    try {
        await page.goto(urlextractFalha);
        await browser.close()
    }catch(e){
        setTimeout(async function(){
            let dadosFinal = []

            fs.createReadStream(filename)
            .pipe(csv.parse({ columns: true, relax_quotes: true, quote: true, escape: '\"', ltrim: true, rtrim: true, trim: true }))
            .on('data', async (dadosLinha) => {
                // console.log(dadosLinha, '----')
                
                // let values = Object.values(dadosLinha)[0].replaceAll(", ", " ").replaceAll('""', ' ').replaceAll('"', '').replaceAll(';', '')
                
                // let dados = values.split(',')
                // dados[0] = dados[0].trim()
                // dados[1] = dados[1].replaceAll("-", "/")
                // let numeroPedido = dados[2].split('/')[1].toString()
                // dados[2] = numeroPedido
                // dados[5] = dados[5].replaceAll("-", "/")
                // dados[8] = dados[8].toString()
                // if ( dados.length != 11 ) { 
                //     console.log(dados, dados.length, Object.values(dadosLinha)[0])
                // }else {
                //    dadosFinal.push(dados) 
                // }
                dadosLinha["ORIGEM"] = dadosLinha["ORIGEM"].split('/')[1].toString()
                dadosFinal.push([
                    dadosLinha['﻿PEDIDO'].trim(),
                    dadosLinha['DATA DO PEDIDO'].replaceAll("-", "/"),
                    dadosLinha["ORIGEM"],
                    dadosLinha["CONTA"],
                    dadosLinha["LOJA"],
                    dadosLinha["DATA"].replaceAll("-", "/"),
                    dadosLinha["TIPO"],
                    dadosLinha["FALHA"],
                    dadosLinha["SKU"].toString(),
                    dadosLinha['DESCRIÇÃO'],
                    dadosLinha['QTD FALTANDO'],
                ])
            })
            .on('end', async function(){
                console.log("fim", dadosFinal.length)
                await escrever_planilha(dadosFinal)
                if ( fs.existsSync(filename) ) {
                    fs.unlinkSync(filename)
                }
                await browser.close()
            })
            .on('error', async function(err){
                console.log(err.message)
            })
        }, 5000)
    }
    
    
} // 'PEDIDO,DATA DO PEDIDO,ORIGEM,CONTA,LOJA,DATA,TIPO,FALHA,SKU,DESCRIÇÃO,QTD FALTANDO'

async function escrever_planilha(dados) {
    await axios.post(urlGooglefalha, dados)
    return true
}

async function extract_estoque() {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    await page.setViewport({width: 1366, height: 980})
    let url = 'https://humble.enviando.nordware.io/'

    await page.goto(url);
    page.waitForNavigation({ waitUntil: 'networkidle0' })

    await page.type('#login > div:nth-child(3) > div > input', 'brunodesenvolvedor');
    await page.type('#login > div:nth-child(4) > div > input', 'Bruno123@');
    
    await Promise.all([
        page.click('#login > div.form-group.text-center.m-t-30 > div > button'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    
    await page.$eval("#main-menu > li:nth-child(7) > a > span:nth-child(2)", element => element.click())
    await page.$eval("#main-menu > li:nth-child(7) > ul > li:nth-child(2) > a", element => element.click())
   
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: __dirname,
    });
    // colocado dentro do try porque estava quebrando a aplicação
    try {
        await page.goto(urlExtractEstoque);
    }catch(e){}
    
    
    await browser.close()
}


extract_falha_pedido()

