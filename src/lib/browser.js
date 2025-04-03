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
        ['j{}', "jQuery('", "')"],
        ['.h{}', ".has('", "')"],
        ['.n{}', ".not('", "')"],
        ['.p{}', '.parent(', ')'],
        ['.f{}', ".find('", "')"],
        ['.c{}', ".css('", "')"],
        ['.g{}', '.get(', ')'],
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

function sendAwaitRespFactory(rawWsClient) {
    const startingId = 10
    let curId = startingId

    async function wsSendAwaitResp(consoleCommand, executeAsync = false) {
        lm(consoleCommand)
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

async function waitPageLoad(ws) {
    wait(2000)
    do {
        wait(300)
    } while ((await ws.j('typeof jQuery')) === 'function')

    await doConsoleSetup(ws)
}

function wrapWebsocket(ws) {
    ws.cons = sendAwaitRespFactory(ws)
    ws.rewrap = rewrapShortenedCommand
    ws.j = (cmd) => ws.cons(ws.rewrap(cmd))
    ws.findAndDo = findAndDoFactory(ws)
    ws.w = (search, timeout) => waitFor(ws, search, timeout)
    ws.waitLoad = () => waitPageLoad(ws)

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
    await wrappedWsClient.cons('$ = jQuery')
    await wrappedWsClient.cons('jQuery.noConflict()')
    await wrappedWsClient.cons('jQuery.noConflict()')
}

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time))

async function waitFor(ws, search, timeout = 10000, interval = 500) {
    const commandList = typeof search === 'string' ? [search] : search

    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
        for (const [index, command] of commandList.entries()) {
            const result = await ws.j(`${command}.length`)
            if (result) return index
        }

        await wait(interval)
    }

    throw new Error('waitFor reached timeout!')
}

function findAndDoFactory(ws) {
    return async function findAndDo(...params) {
        if (!params?.length || params.length % 2 !== 0) {
            throw new Error('findAndDo: must be an even # of params!')
        }

        const queryList = []
        const functionList = []

        for (const [index, param] of params.entries()) {
            if (index % 2 == 0) {
                if (typeof param !== 'string') {
                    throw new Error(
                        'findAndDo: Every even param (0-ind) must be a string!'
                    )
                }
                queryList.push(param)
            }

            if (index % 2 == 1) {
                if (typeof param !== 'function') {
                    throw new Error(
                        'findAndDo: Every odd param (0-ind) must be a function!'
                    )
                }
                functionList.push(param)
            }
        }
        if (queryList.length !== functionList.length) {
            throw new Error('This error should never occur.')
        }

        const foundIndex = await waitFor(ws, queryList)
        await functionList[foundIndex](queryList[foundIndex])
        return foundIndex
    }
}

export { setupWebsocket }
