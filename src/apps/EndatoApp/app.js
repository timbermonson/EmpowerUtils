import config from 'config'

import { lm, lo } from '../../utils/lib.js'

const apiCreds = config.get('endato')

async function run() {
    lo(apiCreds)
}
run()
