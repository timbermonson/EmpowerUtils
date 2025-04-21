import axios from 'axios'
import jQuery from 'jquery'
import { JSDOM } from 'jsdom'
import https from 'https'

enum SearchStatus {
    ERROR = 'error',
    FOUND_MULTIRESULTTABLE = 'found_multiresulttable',
    FOUND_RESULTPAGE = 'found_resultpage',
    NONE = 'none',
}

function getJQWindow(data: D_WebResponseData): I_JQDomWindow {
    const { window } = new JSDOM(data, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    })

    const jq: (query: string) => any = jQuery(window) as any

    return { $: jq, ...window }
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
): Promise<D_WebResponseData> {
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

    const { data: responseData } = await axios(options)

    if (typeof responseData !== 'string') {
        throw new Error(
            `getWebpage: could not retrieve response data!\nOptions: ${JSON.stringify(
                options,
                null,
                2
            )}`
        )
    }

    return responseData as D_WebResponseData
}

export { getJQWindow, SearchStatus, getWebpage, encodeUrl }
