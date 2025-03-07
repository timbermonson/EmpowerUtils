import { compact } from 'lodash-es'
import qs from 'qs'

import {
    encodeUrl,
    getJQWindow,
    getWebpage,
    nameCommaReverse,
    SearchStatus,
    lm,
} from '../utils/lib.js'
import searchFullNameFactory from './searchFullNameFactory.js'

const baseUrl = 'http://apps.saltlakecounty.gov/assessor/new/resultsMain.cfm'

function getUniqIdWebpageFactory(id) {
    const param = `parcelId=${id}`

    return async function getUniqIdWebpage() {
        const resp = await getWebpage(baseUrl, {
            queryParamList: [param],
        })
        return resp
    }
}

function getFullNameWebpageFactory(fullName) {
    const param = `itemname=${encodeUrl(nameCommaReverse(fullName))}`

    return async function getFullNameWebpage() {
        const resp = await getWebpage(baseUrl, {
            queryParamList: [param],
        })
        return resp
    }
}

function parseSearchStatus(resp) {
    const window = getJQWindow(resp)

    const pageTitleQ = window.$('#MainTitle')
    if (pageTitleQ?.[0]?.textContent?.trim() === 'Parcel Details') {
        return SearchStatus.FOUND_RESULTPAGE
    }

    if (pageTitleQ?.[0]?.textContent?.trim() !== 'Parcel Search Results') {
        return SearchStatus.ERROR
    }

    const result1Q = window.$('#resultBlock1')
    if (!result1Q?.length) {
        return SearchStatus.NONE
    }

    // Every second table result is an address
    const resultListQ = result1Q.parent()?.find('tr:nth-child(2n)')
    if (resultListQ?.length) {
        return SearchStatus.FOUND_MULTIRESULTTABLE
    }

    return SearchStatus.ERROR
}

function parseMultiResultUniqIdList(resp) {
    const window = getJQWindow(resp)

    const result1Q = window.$('#resultBlock1')
    if (!result1Q?.length) {
        return []
    }

    const resultInputListQ = result1Q
        .parent()
        ?.find('tr:nth-child(2n) > td:nth-child(2) > input')
    if (!resultInputListQ?.length) {
        return []
    }
    const idList = [...resultInputListQ].map((inp) => inp.getAttribute('value'))

    return idList
}

function parseResultPageAddress(resp) {
    const e = new Error('Could not parse search results!')
    const window = getJQWindow(resp)

    const parcelMainInfoQ = window.$(
        '#parcelFieldNames > div.valueSummBox:nth-child(2) > div > table > tbody'
    )
    const ownerQ = parcelMainInfoQ?.find('tr:nth-child(1) > td:nth-child(2)')
    const ownerList = ownerQ?.[0]?.textContent?.split(';')
    const owner = compact(ownerList?.map((n) => n.trim()))?.join(' & ')

    const streetQ = parcelMainInfoQ?.find('tr:nth-child(2) > td:nth-child(2)')
    const street = streetQ?.[0]?.textContent?.trim()

    const cityQ = parcelMainInfoQ?.find('tr:nth-child(7) > td:nth-child(2)')
    const city = cityQ?.[0]?.textContent?.trim().replace(/\/./, '')

    const coordQ = window.$('#googlemap > a')
    let coords
    if (!coordQ?.length) {
        coords = ''
    } else {
        const coordURL = coordQ[0]?.getAttribute('href')
        const coordURLParams = coordURL?.split('?')?.[1]
        const coordURLParamObject = qs.parse(coordURLParams)
        coords = coordURLParamObject?.q ? coordURLParamObject.q : ''
    }

    if ([owner, city, street].some((n) => !n)) {
        throw e // throw if any are empty
    }

    return {
        owner,
        street,
        city,
        coords,
    }
}

const searchFullName = searchFullNameFactory({
    getFullNameWebpageFactory,
    getUniqIdWebpageFactory,
    parseMultiResultUniqIdList,
    parseSearchStatus,
    parseResultPageAddress,
})

export default searchFullName
