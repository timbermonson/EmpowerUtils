import axios from 'axios'
import jQuery from 'jquery'
import jsdom from 'jsdom'

const { JSDOM } = jsdom

const SearchStatus = Object.freeze({
    ERROR: 'error',
    FOUND_MULTIRESULTTABLE: 'found_multiresulttable',
    FOUND_RESULTPAGE: 'found_resultpage',
    NONE: 'none',
})

function getJQWindow(resp) {
    const { window } = new JSDOM(resp, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    })

    window.$ = jQuery(window)

    return window
}

const encodeUrl = encodeURIComponent

async function getWebpage(
    baseUrl,
    { headers, data, queryParamList, method = 'GET', httpsAgent }
) {
    let urlAppendage = ''
    if (queryParamList && queryParamList.length) {
        urlAppendage = `?${queryParamList.join('&')}`
    }

    const url = `${baseUrl}${urlAppendage}`
    const options = {
        data,
        headers,
        httpsAgent,
        method,
        url,
        withCredentials: true,
    }

    const { data: response } = await axios(options)

    return response
}

export { getJQWindow, SearchStatus, getWebpage, encodeUrl }
