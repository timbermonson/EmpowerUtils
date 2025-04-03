import lib from '../../lib/index.js'

const {
    confirm,
    lm,
    logSep,
    appendOutputData,
    commandLineArgsWrapper,
    getInputData,
    setupIOTextFiles,
    writeOutputData,
} = lib.io

const { setupWebsocket } = lib.browser
const Xero = lib.Xero

import { compact } from 'lodash-es'

const debugPort = 9222

async function finish(ws) {
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

async function run() {
    init()

    let ws = await setupWebsocket(debugPort, ({ url }) =>
        url.includes('go.xero.com/app/')
    )

    const xero = new Xero(ws)

    let curLineNum = 0
    while (true) {
        let curLine = ''
        try {
            curLine = getInputLine(curLineNum)
        } catch (e) {
            console.error(e.message)
            break
        }

        appendOutputData(curLine + '\n')
        if (await confirm(`Open imports: [${curLine}]?`)) {
            try {
                await xero.switchToOrg(curLine)
                await xero.navToImports()
            } catch (e) {
                console.error(e)
            }
        }

        if (await confirm('Continue?')) {
            curLineNum += 1
            continue
        }

        break
    }

    await finish(ws)
}

run()
