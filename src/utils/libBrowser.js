import axios from 'axios'
import WebSocket from 'faye-websocket'

async function getWsURL(port, tabSelectorFn) {
    let response
    try {
        response = await axios.get(`http://localhost:${port}/json`)
    } catch (e) {
        throw new Error('Could not get debugger browser JSON!')
    }
    if (!response?.data?.length)
        throw new Error('Debugger JSON did not provide array!')

    const wsUrl = response.data.find(tabSelectorFn)['webSocketDebuggerUrl']

    if (!wsUrl?.length)
        throw new Error('Could not find/parse debugger websocket url!')

    return wsUrl
}

function wsSendAwaitRespFactory(ws) {
    const startingId = 10
    let curId = startingId

    async function wsSendAwaitResp(consoleCommand) {
        const msgId = curId
        const msg = {
            id: msgId,
            params: {
                expression: consoleCommand,
                objectGroup: 'console',
                includeCommandLineAPI: true,
                silent: false,
                userGesture: true,
            },
            method: 'Runtime.evaluate',
        }

        return await new Promise(async (res, reject) => {
            await ws.on('message', (event) => {
                const respData = JSON.parse(event.data)

                if (respData.id === msgId) res(respData.result.result.value)
            })

            ws.send(JSON.stringify(msg))

            curId += 1
        })
    }

    return wsSendAwaitResp
}

async function setupWebsocket(port, tabSelectorFn) {
    const wsUrl = await getWsURL(port, tabSelectorFn)

    console.log(wsUrl)

    let ws = new WebSocket.Client(wsUrl)

    ws.on('open', function (event) {
        console.log('♦ websocket: open')
    })

    ws.on('close', function (event) {
        console.log('♦ websocket: close:', event.code, event.reason)
        ws = null
    })

    return ws
}

export { setupWebsocket, wsSendAwaitRespFactory }
