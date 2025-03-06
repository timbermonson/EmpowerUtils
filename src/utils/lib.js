import axios from 'axios'
import { compact } from 'lodash-es'
import jsdom from 'jsdom'
import jQuery from 'jquery'

const { JSDOM } = jsdom

function getJQWindow(resp) {
    const { window } = new JSDOM(resp, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    })

    window.$ = jQuery(window)

    return window
}

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
    FOUND_MULTIRESULTTABLE: 'found_multiresulttable',
    FOUND_RESULTPAGE: 'found_resultpage',
    NONE: 'none',
})

async function getWebpage(
    baseUrl,
    { headers, data, queryParamList, method = 'GET' }
) {
    let urlAppendage = ''
    if (queryParamList && queryParamList.length) {
        urlAppendage = `?${queryParamList.join('&')}`
    }

    const url = `${baseUrl}${urlAppendage}`
    const options = {
        url,
        method,
        headers,
        data,
        withCredentials: true,
    }

    const { data: response } = await axios(options)

    return response
}

export {
    encodeUrl,
    getJQWindow,
    getWebpage,
    le,
    lm,
    lo,
    nameCommaReverse,
    SearchStatus,
}
