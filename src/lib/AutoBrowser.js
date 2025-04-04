import axios from 'axios'
import WebSocket from 'faye-websocket'

import { lm, lo } from './io.js'
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
    lm(`Selected tab: ${selectedTab.url}`)
    const { webSocketDebuggerUrl: wsUrl } = selectedTab

    return wsUrl
}

/**
 * Assures that input is an array-- if it isn't, puts it in one.
 */
function arrayize(inp) {
    if (typeof inp === 'object' && inp.length) {
        return inp
    }

    return [inp]
}

export default class AutoBrowser {
    static clipboardInjector =
        "function ctc(text) {{}    const input = document.createElement('input');    input.value = text;    document.body.appendChild(input);    input.select();    document.execCommand('copy');    document.body.removeChild(input);{}}"

    static jQueryInjector =
        "await new Promise((res)=>{var script = document.createElement('script'); script.src = 'https://code.jquery.com/jquery-3.7.1.min.js'; document.getElementsByTagName('head')[0].appendChild(script);script.onload=res();})"

    ws
    isSetup = false

    msgCurId = 1000

    async type(search, text) {
        if (typeof search !== 'string')
            throw new Error('type(): search much be a string!')

        await this.w(search)
        await this.j(`${search}.g{0}.value = ${JSON.stringify(text)}`)
        await this.j(`${search}.dispatchEvent(new KeyboardEvent("keyup"))`)
    }

    async click(search) {
        const searchList = arrayize(search)

        const fParamList = []
        searchList.forEach((searchTerm) => {
            fParamList.push(searchTerm)
            fParamList.push(async (q) => await this.j(`${q}.g{0}.click()`))
        })

        return this.f(...fParamList)
    }

    async f(...params) {
        return await this.findAndDo(...params)
    }

    async findAndDo(...searchAndCallbackList) {
        if (
            !searchAndCallbackList?.length ||
            searchAndCallbackList.length % 2 !== 0
        ) {
            throw new Error('findAndDo: must be an even # of params!')
        }

        const queryList = []
        const functionList = []

        for (const [index, param] of searchAndCallbackList.entries()) {
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

    async waitFor(search, timeout = 10000, interval = 300) {
        const searchList = arrayize(search)
        const startTime = Date.now()

        while (Date.now() - startTime < timeout) {
            for (const [index, search] of searchList.entries()) {
                if (await this.has(search)) return index
            }

            await wait(interval)
        }

        throw new Error(
            `waitFor reached timeout!\nsearchList:\n${JSON.stringify(
                searchList
            )}`
        )
    }

    async has(search) {
        return !!(await this.j(`${search}.length`))
    }

    async waitPageLoad() {
        wait(2000)
        do {
            wait(300)
        } while ((await this.j('typeof jQuery')) === 'function')

        await this.doConsoleSetup()
    }

    async j(...params) {
        // lm(params)n
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
        lm('Injecting console methods...')
        await this.cons(jQueryInjector, true)
        await this.cons(clipboardInjector)
        await this.cons('$ = jQuery')
        await this.cons('jQuery.noConflict()')
        await this.cons('jQuery.noConflict()')
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
        lm('Reading open tabs...')
        const wsUrl = await getWebsocketURL(port, tabSelectorFn)

        let newWs
        try {
            lm('Connecting websocket...')
            newWs = new WebSocket.Client(wsUrl)
        } catch (e) {
            throw new Error(
                `Browser websocket client failed to connect to [${wsUrl}]: \n${e.message}`
            )
        }
        lm('Websocket connected!')
        lm('Registering handlers...')

        newWs.on('open', function (event) {
            lm('♦ websocket: open')
        })

        newWs.on('close', function (event) {
            lm('♦ websocket: close:', event.code, event.reason)
            this.ws = null
        })

        this.ws = newWs
        await this.doConsoleSetup()
        this.setup = true
        lm('Browser automations ready!')
    }

    async close() {
        await this.ws.close()
    }
}
