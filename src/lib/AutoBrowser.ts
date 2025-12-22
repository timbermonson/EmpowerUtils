import axios from 'axios'
import chalk from 'chalk'
import express from 'express'
import path from 'path'
import WebSocket from 'ws'
import config from 'config'
import fs from 'fs'

const ioFolder = config.get('io.files.ioFolder') as string

import { Server as ServerType } from 'net'

import { confirm, lm, logSep } from './io.js'
import { TimeoutError, doWhileUndefined, wait } from './etc.js'
import { T_JQueryTemplater, jqTemplaterFactory } from './string.js'

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

function pathIsChildOfFolder(childPath: string, parentFolder: string) {
    if (!path.isAbsolute(childPath) || !path.isAbsolute(parentFolder)) {
        throw new Error('Provided paths must be absolute!')
    }

    const relativePath = path.relative(parentFolder, childPath)
    return !relativePath.startsWith('..')
}

export default class AutoBrowser {
    #webSocket: null | WebSocket
    #webSocketCurMsgId = 1000

    static jQueryInjector =
        "await new Promise((res)=>{var script = document.createElement('script'); script.src = 'https://code.jquery.com/jquery-3.7.1.slim.min.js'; document.getElementsByTagName('head')[0].appendChild(script);script.onload=res();})"
    $ = jqTemplaterFactory('jQuery')

    static headerVarName = '_AutoBrowserHeader'
    static headerHTML = `<h4 style=\\"color:white;font-size: 20px;width:100%;z-index: 1000000;position: fixed;top: 0px;text-align: center;background-color: IndianRed;margin:0px;\\">Browser is being automated!<br></h4>`
    static headerInjector = `${AutoBrowser.headerVarName} = document.createElement("div");${AutoBrowser.headerVarName}.id = "${AutoBrowser.headerVarName}";document.body.insertBefore(${AutoBrowser.headerVarName}, document.querySelector("body > :first-child"));`
    static showHeaderCommand = `${AutoBrowser.headerVarName}.style["height"] = "20px";${AutoBrowser.headerVarName}.innerHTML =  "${AutoBrowser.headerHTML}"`
    static hideHeaderCommand = `${AutoBrowser.headerVarName}.style["height"] = "0px";${AutoBrowser.headerVarName}.innerHTML =  "";`
    #headerShowing = false

    static keyListenerServerPort = 8283

    static fileTransferServerPort = 8287
    static fileTransferBrowserVar = '_AutoBrowserFileTransferFile'
    #fileTransferServer: ReturnType<typeof express>
    #fileTransferFilePath: string

    constructor() {
        this.#fileTransferServer = express()
        this.#fileTransferServer.get('/', (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', '*')
            res.setHeader('Access-Control-Allow-Headers', '*')

            res.sendFile(this.#fileTransferFilePath)
        })
    }

    #hostFile(filePath: string): ServerType {
        if (!fs.statSync(filePath).isFile()) {
            throw new Error('Path must point to a file!')
        }
        if (!path.isAbsolute(filePath)) {
            throw new Error(
                'File to be transferred must be given as an absolute path!'
            )
        }
        if (!pathIsChildOfFolder(filePath, path.resolve(ioFolder))) {
            throw new Error(
                'File to be transferred must be a child of the io folder specified in config!'
            )
        }

        this.#fileTransferFilePath = filePath

        return this.#fileTransferServer.listen(
            AutoBrowser.fileTransferServerPort
        )
    }

    async getText(jQuery: T_JQueryTemplater) {
        return this.sendQuery(jQuery.get(0).textContent)
    }

    async #transferFileToBrowser(filePath: string) {
        const { fileTransferBrowserVar: browserVar } = AutoBrowser

        const listener = this.#hostFile(filePath)
        const fileNameAndExt = `${path.parse(filePath).name}${
            path.parse(filePath).ext
        }`

        try {
            await this.cons(`let ${browserVar}Blob;`)
            await this.cons(
                `${browserVar}Blob = await (await fetch("http://127.0.0.1:${AutoBrowser.fileTransferServerPort}/")).blob();`,
                true
            )
            await this.cons(
                `let ${browserVar} = new File([${browserVar}Blob], "${fileNameAndExt}");`
            )
        } catch (e) {
            throw e
        } finally {
            listener.close()
        }
    }

    async listenForKey(key: string, callback: () => any) {
        if (key.length !== 1) {
            throw new Error(
                'listenForKey\'s "key" needs to be 1 character long.'
            )
        }

        const keyListenerServer = express()
        keyListenerServer.post('/', (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', '*')
            res.setHeader('Access-Control-Allow-Headers', '*')

            callback()
            res.end()
        })

        const browserCommand = `window.addEventListener('keydown', event => {const targetTag = event.target.tagName.toLowerCase() ;if (targetTag === 'input' || targetTag === 'textarea') return;if(event.key !== '${key}') return;fetch("http://127.0.0.1:${AutoBrowser.keyListenerServerPort}/", {method: "POST"});})`
        await this.cons(browserCommand)
        return keyListenerServer.listen(AutoBrowser.keyListenerServerPort)
    }

    async dropFile(jQuery: T_JQueryTemplater, filePath: string) {
        const { fileTransferBrowserVar: browserVar } = AutoBrowser

        await this.#transferFileToBrowser(filePath)

        await this.cons(`let ${browserVar}DT = new DataTransfer()`)
        await this.cons(`${browserVar}DT.items.add(${browserVar})`)
        await this.cons(
            `let ${browserVar}Event = new DragEvent("drop", {bubbles: true, cancelable: true, dataTransfer: ${browserVar}DT})`
        )
        await this.sendQuery(
            jQuery.get(0),
            `.dispatchEvent(${browserVar}Event)`
        )
    }

    async type(jQuery: T_JQueryTemplater, text: string) {
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

    async click(jQuery: T_JQueryTemplater) {
        return this.clickFirstVisible([jQuery])
    }

    async clickInstance(jQuery: T_JQueryTemplater, instance: number) {
        const callback = async (jQuery: T_JQueryTemplater) =>
            this.sendQuery(jQuery.get(instance), '.click()')

        return this.findAndDo([jQuery], Array([jQuery].length).fill(callback))
    }

    async clickFirstVisible(jQueryList: Array<T_JQueryTemplater>) {
        const callback = async (jQuery: T_JQueryTemplater) =>
            this.sendQuery(jQuery.get(0), '.click()')

        return this.findAndDo(
            jQueryList,
            Array(jQueryList.length).fill(callback)
        )
    }

    async findAndDo(
        jQueryList: T_JQueryTemplater[],
        actionCallbackList: ((query: T_JQueryTemplater) => Promise<void>)[]
    ) {
        if (jQueryList.length !== actionCallbackList.length) {
            throw new Error('This error should never occur.')
        }

        const foundIndex = await this.waitForMult(jQueryList)
        await actionCallbackList[foundIndex](jQueryList[foundIndex])
        return foundIndex
    }

    async waitFor(
        jQuery: T_JQueryTemplater,
        timeout = 5000,
        interval = 300
    ): Promise<number> {
        return this.waitForMult([jQuery], timeout, interval)
    }

    async waitForMult(
        jQueryList: Array<T_JQueryTemplater>,
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

    async has(jQuery: T_JQueryTemplater) {
        return !!(await this.sendQuery(jQuery.length))
    }

    async hasNumber(jQuery: T_JQueryTemplater): Promise<number> {
        const length = await this.sendQuery(jQuery.length)
        return length ? length : 0
    }

    async sendQuery(jQuery: T_JQueryTemplater, suffix = '') {
        return this.cons(`${jQuery.toString()}${suffix}`)
    }

    async waitPageLoad(awaitConfirm: boolean = false) {
        await doWhileUndefined(7000, 100, async () => {
            if ((await this.cons('typeof jQuery')) !== 'function') {
                return true
            }
        })
        if (this.#headerShowing) {
            await this.headerShow()
        }
        await doWhileUndefined(20000, 100, async () => {
            if (
                (await this.cons('document.readyState === "complete"')) === true
            ) {
                return true
            }
        })
        if (awaitConfirm) {
            await confirm('do console setup?')
        }
        await this.doConsoleSetup()
    }

    async headerShow() {
        await this.#headerSetup()
        await this.cons(AutoBrowser.showHeaderCommand)
        this.#headerShowing = true
    }

    async headerHide() {
        await this.#headerSetup()
        await this.cons(AutoBrowser.hideHeaderCommand)
        this.#headerShowing = false
    }

    async #headerSetup() {
        const { headerVarName, headerInjector } = AutoBrowser

        await doWhileUndefined(7000, 100, async () => {
            if (
                await this.cons(
                    '!!document.querySelector("body > :first-child")'
                )
            ) {
                return true
            }
        })

        if (
            (await this.cons(
                'document.querySelector("body > :first-child").id'
            )) === headerVarName
        ) {
            return
        }
        await this.cons(headerInjector)

        if (
            (await this.cons(
                'document.querySelector("body > :first-child").id'
            )) !== headerVarName
        ) {
            throw new Error('Failed to setup header!')
        }
    }

    async #jQuerySetup() {
        await doWhileUndefined(7000, 100, async () => {
            if (
                (await this.cons('document.readyState === "complete"')) === true
            ) {
                return true
            }
        })
        if ((await this.cons('typeof jQuery')) !== 'function') {
            await wait(300)
            await this.cons(AutoBrowser.jQueryInjector, true)

            await doWhileUndefined(12000, 300, async () => {
                if ((await this.cons('typeof jQuery')) === 'function') {
                    return true
                }
            })
        }

        await this.cons('jQuery.noConflict();')
        await wait(100)
    }

    async doConsoleSetup() {
        await this.#headerSetup()
        await this.#jQuerySetup()
    }

    async cons(
        consoleCommand: string,
        executeAsync = false,
        echoInBrowser = true
    ): Promise<any> {
        if (!consoleCommand.trim().length) {
            throw new Error('cons() Command cannot be empty!')
        }

        const msg = {
            id: this.#webSocketCurMsgId,
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
            this.#webSocket.once('message', async (rawResponseData) => {
                const respData = JSON.parse(rawResponseData.toString())

                if (respData.id === this.#webSocketCurMsgId) {
                    if (!respData?.result?.result) {
                        throw new Error(JSON.stringify(respData, null, 2))
                    }
                    return res(respData.result.result.value)
                }
                throw new Error(
                    "Message listener out of sync! Ensure you're awaiting all browser actions and messages."
                )
            })

            this.#webSocket.send(JSON.stringify(msg))
        })

        if (echoInBrowser) {
            const msgEcho = `${chalk.black(chalk.bgGreen('[_AUTOMATION]'))}: ${
                msg.params.expression
            }`
                .replaceAll('\\', '\\\\')
                .replaceAll('"', '\\"')

            const respEcho = `${chalk.black(
                chalk.bgBlueBright('[_RES]')
            )}: ${JSON.stringify(result, null, 2)}`
                .replaceAll('\\', '\\\\')
                .replaceAll('"', '\\"')

            await this.cons(`console.log("${msgEcho}");`, false, false)
            await this.cons(`console.log("${respEcho}");`, false, false)
        }

        return result
    }

    async connect(port: number, tabSelectorFn: (tabObject: any) => boolean) {
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
                    this.#webSocket = null
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

        this.#webSocket = newWs
        await this.doConsoleSetup()
        logSep('[Ready!]', '-', 'none')
    }

    async close() {
        return await this.#webSocket.close()
    }
}
