import axios from 'axios'
import { compact } from 'lodash-es'

function nameCommaReverse(fullName) {
    const nameList = compact(fullName.split(' '))

    const lastName = nameList[nameList.length - 1]
    const beginning = nameList.slice(0, nameList.length - 1).join(' ')

    const reversedName = `${lastName}, ${beginning}`

    return reversedName
}

function lo(inp) {
    console.log(JSON.stringify(inp, null, 2))
}

function lm(inp) {
    console.log(inp)
}

function le(error, message) {
    throw new Error(`${message}, Error msg: ${error.message}`)
}

const encodeUrl = encodeURIComponent

const SearchStatus = Object.freeze({
    ERROR: 'error',
    FOUND_MULTIPLE: 'found_multiple',
    FOUND_SINGLE: 'found_single',
    NONE: 'none',
})

async function getWebpage(baseUrl, { queryParamList }) {
    let urlAppendage = ''
    if (queryParamList && queryParamList.length) {
        urlAppendage = `?${queryParamList.join('&')}`
    }

    const url = `${baseUrl}${urlAppendage}`
    const { data: response } = await axios.get(url)

    return response
}

export { nameCommaReverse, lo, lm, le, encodeUrl, SearchStatus, getWebpage }
