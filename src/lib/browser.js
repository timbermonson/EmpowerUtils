import axios from 'axios'
import WebSocket from 'faye-websocket'
import { escapeRegExp } from 'lodash-es'

import { lm } from './io.js'

const clipboardInjector =
    "function ctc(text) {{}    const input = document.createElement('input');    input.value = text;    document.body.appendChild(input);    input.select();    document.execCommand('copy');    document.body.removeChild(input);{}}"

const jQueryInjector =
    "await new Promise((res)=>{var script = document.createElement('script'); script.src = 'https://code.jquery.com/jquery-3.7.1.min.js'; document.getElementsByTagName('head')[0].appendChild(script);script.onload=res;})"

function rewrapSingleFunction(cmd, inFnEmptyExample, outFnLeft, outFnRight) {
    if (inFnEmptyExample.length < 3)
        throw new Error('rewrapSingleFunction: inFnEmptyExample too short!')

    const inFnExampleCList = inFnEmptyExample.split('')
    const inFnRightBracket = escapeRegExp(inFnExampleCList.pop())
    const inFnLeftBracket = escapeRegExp(inFnExampleCList.pop())
    const inFnName = escapeRegExp(inFnExampleCList.join(''))

    const searchPattern = new RegExp(
        `${inFnName}${inFnLeftBracket}([^${inFnRightBracket}]+)${inFnRightBracket}`,
        'gi'
    )

    return cmd.replaceAll(searchPattern, `${outFnLeft}$1${outFnRight}`)
}

function rewrapShortenedCommand(cmd) {
    const reWrapList = [
        ['j()', "jQuery('", "')"],
        ['.h()', ".has('", "')"],
        ['.p()', '.parent(', ')'],
        ['.f()', ".find('", "')"],
        ['.c()', ".css('", "')"],
        ['.g()', '.get(', ')'],
    ]

    return reWrapList.reduce(
        (acc, params) =>
            rewrapSingleFunction(acc, params[0], params[1], params[2]),
        cmd
    )
}

async function getWsURL(port, tabSelectorFn) {
    let response
    try {
        response = await axios.get(`http://127.0.0.1:${port}/json`)
    } catch (e) {
        console.error(e)
        throw new Error('Could not get debugger browser JSON!')
    }
    if (!response?.data?.length)
        throw new Error('Debugger JSON did not provide array!')

    const wsUrl = response.data.find(tabSelectorFn)['webSocketDebuggerUrl']

    if (!wsUrl?.length)
        throw new Error('Could not find/parse debugger websocket url!')

    return wsUrl
}

function wsSendAwaitRespFactory(rawWsClient) {
    const startingId = 10
    let curId = startingId

    async function wsSendAwaitResp(consoleCommand, executeAsync = false) {
        curId += 1
        const msgId = curId

        const msg = {
            id: msgId,
            params: {
                expression: executeAsync
                    ? `webSocketFunc = async () => {${consoleCommand}}; webSocketFunc()`
                    : consoleCommand,
                objectGroup: 'console',
                includeCommandLineAPI: true,
                silent: false,
                userGesture: true,
                awaitPromise: true,
            },
            method: 'Runtime.evaluate',
        }

        return new Promise(async (res) => {
            await rawWsClient.once('message', async (event) => {
                const respData = JSON.parse(event.data)

                if (respData.id === msgId) {
                    return res(respData.result.result.value)
                }
                throw new Error('Message listener out of sync!')
            })

            await rawWsClient.send(JSON.stringify(msg))
        })
    }

    return wsSendAwaitResp
}

function wrapWebsocket(ws) {
    ws.cons = wsSendAwaitRespFactory(ws)
    ws.j = (cmd) => ws.cons(rewrapShortenedCommand(cmd))

    return ws
}

async function setupWebsocket(port, tabSelectorFn) {
    const wsUrl = await getWsURL(port, tabSelectorFn)
    let ws = new WebSocket.Client(wsUrl)

    ws.on('open', function (event) {
        lm('♦ websocket: open')
    })

    ws.on('close', function (event) {
        lm('♦ websocket: close:', event.code, event.reason)
        ws = null
    })

    const wrappedWebsocket = wrapWebsocket(ws)
    await doConsoleSetup(wrappedWebsocket)
    return wrappedWebsocket
}

async function doConsoleSetup(wrappedWsClient) {
    await wrappedWsClient.cons(jQueryInjector, true)
    await wrappedWsClient.cons(clipboardInjector)
    await wrappedWsClient.cons('jQuery.noConflict()')
    await wrappedWsClient.cons('$ = jQuery')
}

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time))

async function waitFor(
    wrappedWsClient,
    searchList,
    timeout = 4000,
    interval = 500
) {
    const commandList =
        typeof searchList === 'string' ? [searchList] : searchList

    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
        for (const command of commandList) {
            const result = await wrappedWsClient.j(command)
            lm(result)
            if (result) return 1
        }

        await wait(interval)
    }

    throw new Error('waitFor reached timeout!')
}

export { setupWebsocket, waitFor }
