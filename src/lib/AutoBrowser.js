import axios from 'axios'
import WebSocket from 'faye-websocket'

import { lm, logSep } from './io.js'
import { wait } from './etc.js'
import { rewrapJQueryCommand } from './string.js'

async function getWebsocketURL(port, tabSelectorFn) {
    let response
    try {
        response = await axios.get(`http://127.0.0.1:${port}/json`)
    } catch (e) {
        console.error(e)
        throw new Error('Could not get debugger browser JSON!')
    }
    if (!response?.data?.length)
        throw new Error('Debugger JSON did not provide array!')

    const selectedTab = response.data.find(tabSelectorFn)
    if (!selectedTab || !selectedTab.webSocketDebuggerUrl)
        throw new Error('Could not find/parse debugger websocket url!')
    lm(`○ Selected tab: ${selectedTab.url}`)
    const { webSocketDebuggerUrl: wsUrl } = selectedTab

    return wsUrl
}

/**
 * Assures that input is an array-- if it isn't, puts it in one.
 */
function arrayize(inp) {
    if (typeof inp === 'object' && inp.length) {
        return inp
    } else {
        return [inp]
    }
}

export default class AutoBrowser {
    static clipboardInjector =
        "function ctc(text) {{}    const input = document.createElement('input');    input.value = text;    document.body.appendChild(input);    input.select();    document.execCommand('copy');    document.body.removeChild(input);{}}"

    static jQueryInjector =
        "await new Promise((res)=>{var script = document.createElement('script'); script.src = 'https://code.jquery.com/jquery-3.7.1.min.js'; document.getElementsByTagName('head')[0].appendChild(script);script.onload=res();})"

    ws
    isSetup = false

    msgCurId = 1000

    async type(query, text) {
        if (typeof query !== 'string')
            throw new Error('type(): query much be a string!')

        await this.w(query)
        await this.j(`${query}.g{0}.value = ${JSON.stringify(text)}`)
        await this.j(
            `${query}.g{0}.dispatchEvent(new KeyboardEvent("keydown", {keyCode: 45}))`
        )
        await this.j(`${query}.g{0}.dispatchEvent(new KeyboardEvent("keyup"))`)
    }

    async click(queryOrQueryList) {
        const queryList = arrayize(queryOrQueryList)

        const fParamList = []
        queryList.forEach((query) => {
            fParamList.push(query)
            fParamList.push(async (q) => await this.j(`${q}.g{0}.click()`))
        })

        return this.f(...fParamList)
    }

    async f(...params) {
        return await this.findAndDo(...params)
    }

    async findAndDo(...queryAndCallbackList) {
        if (
            !queryAndCallbackList?.length ||
            queryAndCallbackList.length % 2 !== 0
        ) {
            throw new Error('findAndDo: must be an even # of params!')
        }

        const queryList = []
        const functionList = []

        for (const [index, param] of queryAndCallbackList.entries()) {
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

        const foundIndex = await this.w(queryList)
        await functionList[foundIndex](queryList[foundIndex])
        return foundIndex
    }

    async waitFor(queryOrQueryList, timeout = 7000, interval = 300) {
        const queryList = arrayize(queryOrQueryList)
        const startTime = Date.now()

        while (Date.now() - startTime < timeout) {
            for (const [index, query] of queryList.entries()) {
                if (await this.has(query)) return index
            }

            await this.cons('jQuery.noConflict();')
            await wait(interval)
        }

        throw new Error(
            `waitFor reached timeout!\nqueryList:\n${JSON.stringify(queryList)}`
        )
    }

    async has(query) {
        return !!(await this.j(`${query}.length`))
    }

    async waitPageLoad() {
        wait(2000)
        do {
            wait(300)
        } while ((await this.j('typeof jQuery')) === 'function')

        await this.doConsoleSetup()
    }

    async j(...params) {
        return await this.jQuery(...params)
    }

    async jQuery(cmd) {
        return this.cons(rewrapJQueryCommand(cmd))
    }

    async w(...params) {
        return await this.waitFor(...params)
    }

    async doConsoleSetup() {
        const { jQueryInjector, clipboardInjector } = AutoBrowser
        await this.cons(jQueryInjector, true)
        await this.cons(clipboardInjector)
        await this.cons('$ = jQuery;')
        await this.cons('jQuery.noConflict();')
        await this.cons('jQuery.noConflict();')
    }

    async cons(consoleCommand, executeAsync = false, echo = true) {
        this.msgCurId += 1

        if (!consoleCommand?.trim()?.length) {
            throw new Error('Command cannot be empty!')
        }

        const msg = {
            id: this.msgCurId,
            params: {
                expression: executeAsync
                    ? `asyncFunc = async () => {${consoleCommand}}; asyncFunc()`
                    : consoleCommand,
                objectGroup: 'console',
                includeCommandLineAPI: true,
                silent: false,
                userGesture: true,
                awaitPromise: true,
            },
            method: 'Runtime.evaluate',
        }

        const result = await new Promise(async (res) => {
            await this.ws.once('message', async (event) => {
                const respData = JSON.parse(event.data)

                if (respData.id === this.msgCurId) {
                    if (!respData?.result?.result) {
                        throw new Error(respData)
                    }
                    return res(respData.result.result.value)
                }
                throw new Error(
                    "Message listener out of sync! Ensure you're awaiting any browser actions or messages."
                )
            })

            await this.ws.send(JSON.stringify(msg))
        })

        if (echo) {
            const echoMsg = `[AUTOMATION]: ${msg.params.expression}`
                .replaceAll('\\', '\\\\')
                .replaceAll('"', '\\"')
            await this.cons(`console.log("${echoMsg}");`, false, false)
        }

        return result
    }

    async setup(port, tabSelectorFn) {
        logSep('[Browser automations init]')
        lm('• Reading open tabs...')
        const wsUrl = await getWebsocketURL(port, tabSelectorFn)

        let newWs
        try {
            lm('• Connecting websocket...')
            newWs = new WebSocket.Client(wsUrl)
        } catch (e) {
            throw new Error(
                `Browser websocket client failed to create [${wsUrl}]: \n${e.message}`
            )
        }

        const openTimeout = 5000
        try {
            await new Promise(async (res, reject) => {
                setTimeout(reject, openTimeout)

                newWs.on('close', function (event) {
                    lm('♦ websocket: close:', event.code, event.reason)
                    this.ws = null
                })

                newWs.once('open', function (event) {
                    res()
                })
            })
        } catch (e) {
            throw new Error(
                `Websocket did not open within ${openTimeout / 1000.0} seconds!`
            )
        }

        lm('○ Open and connected!')

        this.ws = newWs
        await this.doConsoleSetup()
        this.setup = true
        logSep('[Browser automations ready!]', ' ')
    }

    async close() {
        await this.ws.close()
    }
}
