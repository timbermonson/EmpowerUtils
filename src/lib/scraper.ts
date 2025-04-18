import axios from 'axios'
import jQuery from 'jquery'
import jsdom from 'jsdom'
import https from 'https'

const { JSDOM } = jsdom

const SearchStatus = Object.freeze({
    ERROR: 'error',
    FOUND_MULTIRESULTTABLE: 'found_multiresulttable',
    FOUND_RESULTPAGE: 'found_resultpage',
    NONE: 'none',
})

function getJQWindow(resp: any) {
    const { window } = new JSDOM(resp, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    })

    window.$ = jQuery(window)

    return window
}

const encodeUrl = encodeURIComponent

async function getWebpage(
    baseUrl: string,
    {
        headers,
        data,
        queryParamList,
        method = 'GET',
        httpsAgent,
    }: {
        headers?: { [key: string]: string }
        data?: any
        queryParamList?: Array<string>
        method?: string
        httpsAgent?: https.Agent
    }
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
