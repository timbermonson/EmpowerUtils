import {
    nameCommaReverse,
    SearchStatus,
    encodeUrl,
    getWebpage,
    lm,
    lo,
} from '../utils/lib.js'
import { compact } from 'lodash-es'
import jsdom from 'jsdom'

const { JSDOM } = jsdom

import searchFullNameFactory from './searchFullNameFactory.js'

function getUniqIdWebpageFactory(id) {
    const baseUrl =
        'https://webercountyutah.gov/parcelsearch/ownership-info.php'
    const param = `id=${id}` // TODO

    return async function getUniqIdWebpage() {
        const resp = await getWebpage(baseUrl, {
            queryParamList: [param],
        })
        return resp
    }
}

function getFullNameWebpageFactory(fullName) {
    const baseUrl = 'https://webercountyutah.gov/parcelsearch/results.php'
    const nameParam = `name=${encodeUrl(nameCommaReverse(fullName)).replace(
        '%20',
        '+'
    )}`

    return async function getFullNameWebpage() {
        const resp = await getWebpage(baseUrl, {
            queryParamList: ['type=name', nameParam],
        })
        return resp
    }
}

function parseSearchStatus(resp) {
    const propertySearch = `${resp}`.match(
        /strong[^>]+>Property<[^c]+class[^>]+>([^\/]+)/
    )
    if (propertySearch && propertySearch.length > 1) {
        return SearchStatus.FOUND_SINGLE
    }

    const document = new JSDOM(resp, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    }).window.document
    const tableDomSearch = document.querySelector('#results')
    const tableContent = compact(
        tableDomSearch.textContent.split('\n').map((n) => n.trim())
    )

    if (tableContent.length < 3) {
        return SearchStatus.ERROR
    }
    if (tableContent.length === 3) {
        return SearchStatus.NONE
    }

    return SearchStatus.FOUND_MULTIPLE
}

function parseMultiResultUniqIdList(resp) {
    const document = new JSDOM(resp, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    }).window.document

    const tableDomSearch = document.querySelector('#results').textContent
    let tableContent = compact(tableDomSearch.split('\n').map((n) => n.trim()))

    if (tableContent.length < 3) {
        return []
    }
    if (tableContent.length === 3) {
        return []
    }
    tableContent = tableContent.slice(3)

    // Every 3rd element is a parcel ID
    const serialIdList = tableContent.filter((val, ind) => ind % 3 === 0)

    return serialIdList
}

function parseSingleResultAddress(resp) {
    const propertySearch = `${resp}`.match(
        /strong[^>]+>Property<[^c]+class[^>]+>([^\/]+)/
    )
    if (!propertySearch || propertySearch.length < 2) {
        throw new Error(`could not parse search results!`)
    }
    const addressMatch = propertySearch[1].match(/\s+([^<]+)<br>\s+([^<]+)</)

    const ownerMatch = `${resp}`.match(
        /strong[^>]+>Owner<[^c]+class[^>]+>([^\/]+)/
    )

    if (
        !addressMatch ||
        addressMatch.length < 3 ||
        !addressMatch[1].trim() ||
        !addressMatch[2].trim() ||
        !ownerMatch ||
        ownerMatch.length < 2
    ) {
        throw new Error(`could not parse search results!`)
    }

    return {
        owner: ownerMatch[1]
            .slice(0, -1)
            .split('<br>')
            .map((n) => n.trim())
            .join(', '),
        street: addressMatch[1].trim(),
        city: addressMatch[2].trim(),
        coords: ``,
    }
}

const searchFullName = searchFullNameFactory({
    getFullNameWebpageFactory,
    getUniqIdWebpageFactory,
    parseMultiResultUniqIdList,
    parseSearchStatus,
    parseSingleResultAddress,
})

export default searchFullName
