import axios from 'axios'
import WebSocket from 'ws'

import { lm, logSep } from './io.js'
import { TimeoutError, doWhileUndefined } from './etc.js'
import { JQueryTemplater, jqTemplaterFactory } from './string.js'

async function getWebsocketURL(
    port: number,
    tabSelectorFn: (tabObject: any) => boolean
) {
    let response: any

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

export default class AutoBrowser {
    static jQueryInjector =
        "await new Promise((res)=>{var script = document.createElement('script'); script.src = 'https://code.jquery.com/jquery-3.7.1.min.js'; document.getElementsByTagName('head')[0].appendChild(script);script.onload=res();})"

    static headerVar = '$myHeader'
    static headerInjector = `let ${AutoBrowser.headerVar} = document.createElement("h4");${AutoBrowser.headerVar}.innerHTML =  "<h4 style=\\"text-align: center;background-color: IndianRed\\">Browser is being automated!<br></h4>"; jQuery("header").get(0).appendChild(${AutoBrowser.headerVar});`
    static showHeaderCommand = `${AutoBrowser.headerVar}.innerHTML =  "<h4 style=\\"text-align: center;background-color: IndianRed\\">Browser is being automated!<br></h4>";`
    static hideHeaderCommand = `${AutoBrowser.headerVar}.innerHTML =  "";`

    ws: null | WebSocket
    setup = false
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

    async type(jQuery: JQueryTemplater, text: string) {
        // Make sure the element is actually "there"
        await this.waitFor(jQuery)

        await this.sendQuery(
            jQuery.get(0),
            `.dispatchEvent(new FocusEvent("focusin", {bubbles:true}))`
        )

        // Set "value" attribute on html element
        await this.sendQuery(
            jQuery.get(0),
            `.setAttribute("value", ${JSON.stringify(text)})`
        )

        // Set actual input value using fancy trickery credit: https://stackoverflow.com/a/60378508
        // Below line was working before I needed the below trickery for a datepicker.
        // Try uncommenting if stuff breaks, but INCLUDING it seems to break the fancy stuff when it's needed.
        // await this.sendQuery(jQuery.get(0), `.value = ${JSON.stringify(text)}`)
        await this.cons(
            '$ab_valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set'
        )
        await this.cons(`$ab_inputElement = ${jQuery.get(0).toString()}`)
        await this.cons(
            `$ab_valueSetter.call($ab_inputElement, ${JSON.stringify(text)})`
        )

        // Try sending an input event to trigger changes
        await this.sendQuery(
            jQuery.get(0),
            `.dispatchEvent(new Event("input", {bubbles: true, value: ${JSON.stringify(
                text
            )}}))`
        )

        // Send a press of the "insert" key, in case a keyup/keydown is necessary to trigger the input's event
        await this.sendQuery(
            jQuery.get(0),
            `.dispatchEvent(new KeyboardEvent("keydown", {keyCode: 45, bubbles: true}))`
        )
        await this.sendQuery(
            jQuery.get(0),
            `.dispatchEvent(new KeyboardEvent("keyup", {keyCode: 45, bubbles: true}))`
        )

        // Finally, try using a focusout to trigger listeners
        await this.sendQuery(
            jQuery.get(0),
            `.dispatchEvent(new FocusEvent("focusout", {bubbles:true}))`
        )
    }

    async click(jQuery: JQueryTemplater) {
        return this.clickFirstVisible([jQuery])
    }

    async clickFirstVisible(jQueryList: Array<JQueryTemplater>) {
        const callback = async (jQuery: JQueryTemplater) =>
            this.sendQuery(jQuery.get(0), '.click()')

        return this.findAndDo(
            jQueryList,
            Array(jQueryList.length).fill(callback)
        )
    }

    async findAndDo(
        jQueryList: JQueryTemplater[],
        actionCallbackList: ((JQueryTemplater) => Promise<void>)[]
    ) {
        if (jQueryList.length !== actionCallbackList.length) {
            throw new Error('This error should never occur.')
        }

        const foundIndex = await this.waitForMult(jQueryList)
        await actionCallbackList[foundIndex](jQueryList[foundIndex])
        return foundIndex
    }

    async waitFor(
        jQuery: JQueryTemplater,
        timeout = 5000,
        interval = 300
    ): Promise<number> {
        return this.waitForMult([jQuery], timeout, interval)
    }

    async waitForMult(
        jQueryList: Array<JQueryTemplater>,
        timeout = 5000,
        interval = 300
    ): Promise<number> {
        try {
            return await doWhileUndefined(timeout, interval, async () => {
                for (const [index, jQuery] of jQueryList.entries()) {
                    if (await this.has(jQuery)) return index
                }

                await this.cons('jQuery.noConflict();')
            })
        } catch (e) {
            if (e instanceof TimeoutError) {
                throw new TimeoutError(
                    `waitFor reached timeout!\nqueryList:\n${jQueryList
                        .map((q) => q.toString())
                        .join('\n')}`
                )
            } else {
                throw e
            }
        }
    }

    async has(jQuery: JQueryTemplater) {
        return !!(await this.sendQuery(jQuery.length))
    }

    async waitPageLoad() {
        await doWhileUndefined(7000, 200, async () => {
            if ((await this.cons('typeof $myHeader')) !== 'object') {
                return true
            }
        })

        await this.doConsoleSetup()
        await this.doConsoleSetup()
    }

    async sendQuery(jQuery: JQueryTemplater, suffix = '') {
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

    async cons(
        consoleCommand: string,
        executeAsync = false,
        echo = true
    ): Promise<any> {
        if (!consoleCommand?.trim()?.length) {
            throw new Error('cons() Command cannot be empty!')
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
            await this.ws.once('message', async (rawResponseData) => {
                const respData = JSON.parse(rawResponseData.toString())

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

        let newWs: undefined | WebSocket
        try {
            lm('• Connecting websocket...')
            newWs = new WebSocket(wsUrl)
        } catch (e) {
            throw new Error(
                `Browser websocket client failed to create [${wsUrl}]: \n${e.message}`
            )
        }

        const openTimeout = 5000
        try {
            await new Promise(async (res, reject) => {
                setTimeout(reject, openTimeout)

                const closeCallback = (eventCode: number) => {
                    lm('♦ websocket: close:', eventCode)
                    this.ws = null
                }
                closeCallback.bind(this)
                newWs.on('close', closeCallback)

                newWs.once('open', function () {
                    res(undefined)
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
