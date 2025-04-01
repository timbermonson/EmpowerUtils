import {
    checkbox as inquirerCheckbox,
    editor as inquirerEditor,
    select as inquirerSelect,
    confirm as inquirerConfirm,
} from '@inquirer/prompts'

import { setupWebsocket } from '../../utils/libBrowser.js'

const debugPort = 9222

async function finish(ws) {
    // await inquirerConfirm({
    //     message: 'Submit any reponse to close.',
    // })
    await ws.close()
}

async function run() {
    let ws = await setupWebsocket(debugPort, ({ url }) =>
        url.includes('go.xero.com/app/')
    )
    const { cons } = ws

    await cons('console.log("hello world (from javascript!)")')
    console.log(
        await cons('jQuery("h2.xui-introbanner--header").get(0).textContent')
    )

    await finish(ws)
}

run()
