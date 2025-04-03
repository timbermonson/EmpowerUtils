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

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time))

async function switchToOrg(ws, orgName) {
    // const dashOpAccBtn =
    //     "$('div.mf-bank-widget-panel').has('h2:contains(\"Operating:\"):contains(\"2894\")).find('.mf-bank-widget-touchtarget')"

    const { j, w, findAndDo: f } = ws

    // Get the menu dropdown open & reset
    await f(
        'j{.xnav-appbutton}.n{.xnav-appbutton-is-active}',
        async (q) => await j(`${q}.click()`),
        'j{.xnav-orgsearchcontainer:has(button.xnav-icon-orgsearchclear)}',
        async (q) => await j(`${q}.f{button.xnav-icon-orgsearchclear}.click()`),
        'j{.xnav-appbutton.xnav-appbutton-is-active}',
        () => {}
    )

    // Type name, select, wait for pageload
    await j('j{[data-name="xnav-changeorgbutton"]}.click()')

    await w('j{.xnav-orgsearch--input}')
    await j(
        `j{input.xnav-orgsearch--input}.g{0}.value = ${JSON.stringify(orgName)}`
    )
    await j(
        `j{input.xnav-orgsearch--input}.g{0}.dispatchEvent(new KeyboardEvent("keyup"))`
    )
    const orgSearchFirst =
        'ol[role="navigation"].xnav-verticalmenu > li:nth-child(1) > a'
    await wait(500)
    await f(`j{${orgSearchFirst}}`, async (q) => await j(`${q}.g{0}.click()`))
    await ws.waitLoad()

    // Nav to imports
    await f(
        'j{.mf-bank-widget-panel:contains("Operating"):contains("2894")>div>div>button}',
        async (q) => await j(`${q}.click()`)
    )
    await f(
        'j{a:contains("Import a Statement")}',
        async (q) => await j(`${q}.g{0}.click()`)
    )
}

async function openImports(ws, orgName) {
    await switchToOrg(ws, orgName)
}

async function run() {
    init()

    let ws = await setupWebsocket(debugPort, ({ url }) =>
        url.includes('go.xero.com/app/')
    )

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
                await openImports(ws, curLine)
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
