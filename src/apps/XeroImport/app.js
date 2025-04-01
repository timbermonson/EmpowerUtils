import {
    checkbox as inquirerCheckbox,
    editor as inquirerEditor,
    select as inquirerSelect,
    confirm as inquirerConfirm,
} from '@inquirer/prompts'

import {
    setupWebsocket,
    wsSendAwaitRespFactory,
} from '../../utils/libBrowser.js'

async function run() {
    let ws = await setupWebsocket(9222, ({ url }) =>
        url.includes('go.xero.com/app/')
    )
    const sendRcv = wsSendAwaitRespFactory(ws)

    // send('console.log("hello world from factory!")')
    const resp = await sendRcv('JSON.stringify({a: "b"})')
    console.log('Response:', resp)

    await inquirerConfirm({
        message: 'Submit any reponse to close.',
    })
    ws.close()
}

run()
