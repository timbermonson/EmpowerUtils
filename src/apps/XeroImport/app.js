import {
    checkbox as inquirerCheckbox,
    editor as inquirerEditor,
    select as inquirerSelect,
    confirm as inquirerConfirm,
} from '@inquirer/prompts'

import lib from '../../lib/index.js'
const {
    lm,
    logSep,
    appendOutputData,
    commandLineArgsWrapper,
    getInputData,
    setupIOTextFiles,
    writeOutputData,
} = lib.io
const { combineSpaces } = lib.str
const { setupWebsocket, waitFor, rewrapTextFunction } = lib.browser

async function conf(msg) {
    return await inquirerConfirm({
        message: msg,
    })
}

import { compact } from 'lodash-es'

const debugPort = 9222

async function finish(ws) {
    // await inquirerConfirm({
    //     message: 'Submit any reponse to close.',
    // })
    await ws.close()
}

function init() {
    setupIOTextFiles()
    commandLineArgsWrapper()
    writeOutputData('')
}

function getInputLine(lineNum) {
    const inputLines = compact(
        getInputData()
            ?.split('\n')
            ?.map((l) => l.trim()) || []
    )

    if (!inputLines?.length) {
        throw new Error('No input!')
    }

    return inputLines[lineNum]
}

async function switchToOrg(ws, orgName) {
    // const dashOpAccBtn =
    //     "$('div.mf-bank-widget-panel').has('h2:contains(\"Operating:\"):contains(\"2894\")).find('.mf-bank-widget-touchtarget')"

    const w = async (cmd) => {
        await waitFor(ws, cmd)
    }
    const { cons: c } = ws

    await c("$('.xnav-appbutton--body').click()")
    await w('$(".xnav-appmenu--body-is-open").length')
    await w(['$(\'[data-name="xnav-changeorgbutton"]\').length'])
    await c('$(\'[data-name="xnav-changeorgbutton"]\').click()')
}

async function openImports(ws, orgName) {
    await switchToOrg(ws, orgName)
}

async function run() {
    const inputFirstLine = init()

    let ws = await setupWebsocket(debugPort, ({ url }) =>
        url.includes('go.xero.com/app/')
    )
    const { cons } = ws

    let curLineNum = 0
    while (true) {
        let curLine = ''
        try {
            curLine = getInputLine(curLineNum)
        } catch (e) {
            console.error(e.message)
            break
        }

        appendOutputData(curLine)
        if (await conf(`Open imports: [${curLine}]?`)) {
            try {
                await openImports(ws, curLine)
            } catch (e) {
                console.error(e)
            }
        }

        if (await conf('Next?')) {
            curLineNum += 1
            continue
        }

        break
    }

    await cons('console.log("hello world (from javascript!)")')
    console.log(
        await cons('jQuery("h2.xui-introbanner--header").get(0).textContent')
    )

    await finish(ws)
}

run()
