import { nameCommaReverse, SearchStatus, getWebpage } from '../utils/lib.js'

import qs from 'qs'
import jsdom from 'jsdom'

const { JSDOM } = jsdom

import searchFullNameFactory from './searchFullNameFactory.js'

function getUniqIdWebpageFactory(id) {
    const baseUrl =
        'https://eweb.washco.utah.gov:8443/recorder/taxweb/account.jsp'
    const param = `accountNum=${id}`
    const options = {
        queryParamList: [param],
        headers: {
            Cookie: 'isLoggedInAsPublic=true;',
        },
    }

    return async function getUniqIdWebpage() {
        const resp = await getWebpage(baseUrl, options)
        return resp
    }
}

function getFullNameWebpageFactory(fullName) {
    const baseUrl =
        'https://eweb.washco.utah.gov:8443/recorder/taxweb/results.jsp'

    const options = {
        method: 'POST',
        data: qs.stringify({
            OwnerIDSearchString: nameCommaReverse(fullName),
            OwnerIDSearchType: 'Advanced',
            AllTypes: 'ALL',
            docTypeTotal: 2,
        }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: 'isLoggedInAsPublic=true',
        },
    }

    return async function getFullNameWebpage() {
        const resp = await getWebpage(baseUrl, options)
        return resp
    }
}

function parseSearchStatus(resp) {
    const document = new JSDOM(resp, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    }).window.document

    const accountDomSearch = document.querySelector('.accountSummary > tbody')
    if (accountDomSearch) {
        return SearchStatus.FOUND_SINGLE
    }

    const tableDomSearch = document.querySelector('#searchResultsTable')
    if (!tableDomSearch) {
        return SearchStatus.NONE
    }

    const tableDataSearch = document.querySelectorAll(
        '#searchResultsTable > * > tr > td'
    )
    if (!tableDataSearch.length) {
        return SearchStatus.NONE
    }

    const tableData = [...tableDataSearch].map((r) => r.textContent)

    return SearchStatus.FOUND_MULTIPLE
}

function parseMultiResultUniqIdList(resp) {
    const document = new JSDOM(resp, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    }).window.document

    const tableDomSearch = document.querySelector('#searchResultsTable')
    if (!tableDomSearch) {
        return []
    }

    const tableDataSearch = document.querySelectorAll(
        '#searchResultsTable > * > tr > td'
    )
    if (!tableDataSearch.length) {
        return []
    }

    const tableData = [...tableDataSearch].map((r) => r.textContent)
    const serialIdList = tableData
        .filter((v, ind) => ind % 2 === 0)
        .map((id) => id.trim())

    return serialIdList
}

function parseSingleResultAddress(resp) {
    const e = new Error('Could not parse search results!')
    const document = new JSDOM(resp, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    }).window.document

    const tableDomSearch = document.querySelector('.accountSummary > tbody')
    if (!tableDomSearch) {
        throw e
    }

    const addressSearch = document.querySelector(
        '.accountSummary > tbody > tr:nth-child(2) > td:nth-child(1) > table > tbody > tr:nth-child(5)'
    )
    if (!addressSearch) {
        throw e
    }
    const addressContent = addressSearch.innerHTML

    const streetMatch = `${addressContent}`.match(/\/strong>([^,]+),/)
    const cityMatch = `${addressContent}`.match(/\/strong>[^,]+,([^<]+)/)

    const ownerSearch = document.querySelector(
        '.accountSummary > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(1) > td'
    )
    const ownerName = ownerSearch.textContent

    if (
        !streetMatch ||
        !streetMatch[1].replace('&nbsp;', '').trim() ||
        !cityMatch ||
        !cityMatch[1] ||
        !ownerName
    ) {
        throw new Error(`could not parse search results!`)
    }

    return {
        owner: ownerName,
        street: streetMatch[1].trim(),
        city: cityMatch[1].trim(),
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
