import axios from 'axios'
import WebSocket from 'faye-websocket'

import { lm, logSep } from './io.js'
import { wait } from './etc.js'
import { jqTemplaterFactory } from './string.js'

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
    lm(`○ Selected! url: ${selectedTab.url}`)
    const { webSocketDebuggerUrl: wsUrl } = selectedTab

    return wsUrl
}

/**
 * Assures that input is an array-- if it isn't, puts it in one.
 */
function arrayize(inp) {
    if (typeof inp === 'object' && inp.forEach) {
        return inp
    } else {
        return [inp]
    }
}

function requireJQueryObj(inp, customMsg) {
    if (typeof inp !== 'object' || typeof inp?.find !== 'function') {
        throw new Error(
            customMsg ||
                `Parameter must be a jQuery object! Received: ${JSON.stringify(
                    inp
                )}`
        )
    }
}

export default class AutoBrowser {
    static jQueryInjector =
        "await new Promise((res)=>{var script = document.createElement('script'); script.src = 'https://code.jquery.com/jquery-3.7.1.min.js'; document.getElementsByTagName('head')[0].appendChild(script);script.onload=res();})"

    static headerInjector =
        'let $myHeader = document.createElement("h4");$myHeader.innerHTML =  "<h4 style=\\"text-align: center;background-color: IndianRed\\">Browser is being automated!<br></h4>"; jQuery("header").get(0).appendChild($myHeader);'

    static showHeaderCommand =
        '$myHeader.innerHTML =  "<h4 style=\\"text-align: center;background-color: IndianRed\\">Browser is being automated!<br></h4>";'
    static hideHeaderCommand = '$myHeader.innerHTML =  "";'

    #ws
    msgCurId = 1000

    isConnected = false
    $ = jqTemplaterFactory('jQuery')

    async showHeader() {
        await this.doConsoleSetup()
        await this.waitFor(this.$('header'))
        await this.cons(AutoBrowser.showHeaderCommand)
    }

    async hideHeader() {
        await this.waitFor(this.$('header'))
        await this.cons(AutoBrowser.hideHeaderCommand)
    }

    async type(jQuery, text) {
        requireJQueryObj(jQuery)

        await this.waitFor(jQuery)
        await this.sendQuery(jQuery.get(0), `.value = ${JSON.stringify(text)}`)
        await this.sendQuery(
            jQuery.get(0),
            `.dispatchEvent(new KeyboardEvent("keydown", {keyCode: 45}))`
        )
        await this.sendQuery(
            jQuery.get(0),
            `.dispatchEvent(new KeyboardEvent("keyup"))`
        )
    }

    async click(queryOrQueryList) {
        const jQueryList = arrayize(queryOrQueryList)
        jQueryList.forEach((j) => requireJQueryObj(j))

        const fParamList = []
        jQueryList.forEach((jQuery) => {
            fParamList.push(jQuery)
            fParamList.push(
                async (q) => await this.sendQuery(jQuery.get(0), '.click()')
            )
        })

        return this.findAndDo(...fParamList)
    }

    async findAndDo(...queryAndCallbackList) {
        if (
            !queryAndCallbackList?.length ||
            queryAndCallbackList.length % 2 !== 0
        ) {
            throw new Error('findAndDo: must be an even # of params!')
        }

        const jQueryList = []
        const functionList = []

        for (const [index, param] of queryAndCallbackList.entries()) {
            if (index % 2 == 0) {
                requireJQueryObj(
                    param,
                    'findAndDo: Every even param (0-ind) must be a string!'
                )

                jQueryList.push(param)
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

        if (jQueryList.length !== functionList.length) {
            throw new Error('This error should never occur.')
        }

        const foundIndex = await this.waitFor(jQueryList)
        await functionList[foundIndex](jQueryList[foundIndex])
        return foundIndex
    }

    async waitFor(jQueryOrJQueryList, timeout = 5000, interval = 300) {
        const jQueryList = arrayize(jQueryOrJQueryList)
        jQueryList.forEach((j) => requireJQueryObj(j))

        const startTime = Date.now()

        while (Date.now() - startTime < timeout) {
            for (const [index, jQuery] of jQueryList.entries()) {
                if (await this.has(jQuery)) return index
            }

            await this.cons('jQuery.noConflict();')
            await wait(interval)
        }

        throw new Error(
            `waitFor reached timeout!\nqueryList:\n${JSON.stringify(
                jQueryList
            )}`
        )
    }

    async has(jQuery) {
        requireJQueryObj(jQuery)
        return !!(await this.sendQuery(jQuery.length))
    }

    async waitPageLoad() {
        wait(3000)
        do {
            wait(300)
        } while ((await this.cons('typeof $myHeader')) === 'object')

        await this.doConsoleSetup()
        await this.doConsoleSetup()
    }

    async sendQuery(jQuery, suffix = '') {
        requireJQueryObj(jQuery)
        return this.cons(`${jQuery.toString()}${suffix}`)
    }

    async doConsoleSetup() {
        const { jQueryInjector, headerInjector } = AutoBrowser

        await this.cons(jQueryInjector, true)
        await this.cons('$ = jQuery;')
        await this.cons('jQuery.noConflict();')
        await this.cons('jQuery.noConflict();')
        await this.waitFor(this.$('header'))
        await this.cons(headerInjector)
    }

    async cons(consoleCommand, executeAsync = false, echo = true) {
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
                        throw new Error(JSON.stringify(respData, null, 2))
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

    async connect(port, tabSelectorFn) {
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

        lm('○ Connected!')

        this.ws = newWs
        await this.doConsoleSetup()
        await this.hideHeader()
        this.setup = true
        logSep('[Browser automations ready!]', ' ', 'none')
    }

    async close() {
        await this.ws.close()
    }
}
