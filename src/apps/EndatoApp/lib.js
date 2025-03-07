import axios from 'axios'
import config from 'config'

const apiKeyName = config.get('endato.profileKeyName')
const apiKeyPassword = config.get('endato.profileKeyPassword')

async function contactEnrichCall(body) {
    const response = {}
    // await axios({
    //     url: 'https://devapi.endato.com/Contact/Enrich',
    //     method: 'POST',
    //     headers: {
    //         accept: 'application/json',
    //         'content-type': 'application/json',
    //         'galaxy-ap-name': apiKeyName,
    //         'galaxy-ap-password': apiKeyPassword,
    //         'galaxy-search-type': 'DevAPIContactEnrich',
    //     },
    //     data: body,
    // })

    return response
}

export { contactEnrichCall }
