import { compact } from 'lodash-es'
import qs from 'qs'

import lib from '../../../lib/index.ts'

import searchFullNameFactory from './searchFullNameFactory.js'

const { getJQWindow, getWebpage, SearchStatus } = lib.scraper
const { nameReverse } = lib.str

// Search Page: https://qdocs.sevier.utah.gov/recorder/taxweb/search.jsp

function getUniqIdWebpageFactory(id) {
    const baseUrl = 'https://qdocs.sevier.utah.gov/recorder/taxweb/account.jsp'
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
    const baseUrl = 'https://qdocs.sevier.utah.gov/recorder/taxweb/results.jsp'

    const options = {
        method: 'POST',
        data: qs.stringify({
            OwnerIDSearchString: nameReverse(fullName),
            OwnerIDSearchType: 'Advanced',
            AllTypes: 'ALL',
            docTypeTotal: 3,
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
    const window = getJQWindow(resp)

    const singleResultQ = window.$(
        '#middle > h1:first-child:contains("Account")'
    )
    if (singleResultQ?.length === 1) {
        return SearchStatus.FOUND_RESULTPAGE
    }

    const noResultsQ = window.$('p.warning:contains("No results found")')
    if (noResultsQ?.length) {
        return SearchStatus.NONE
    }

    const resultTableRowsQ = window
        .$('#searchResultsTable > tbody > tr')
        .not(':first-child')
    if (resultTableRowsQ?.length) {
        return SearchStatus.FOUND_MULTIRESULTTABLE
    }

    return SearchStatus.ERROR
}

function parseMultiResultUniqIdList(resp) {
    const window = getJQWindow(resp)

    const resultTableRowsQ = window
        .$('#searchResultsTable > tbody > tr')
        .not(':first-child')
    if (!resultTableRowsQ?.length) {
        return []
    }

    const serialIdListQ = resultTableRowsQ.find('td:first-child > a')
    if (!serialIdListQ?.length) {
        return []
    }

    const serialIdList = compact(
        [...serialIdListQ]
            .map((result) => result?.textContent?.trim())
            .filter((n) => !n.startsWith('W'))
    )
    if (!serialIdList.length) {
        return []
    }

    return serialIdList
}

function parseResultPageAddress(resp) {
    const e = new Error('Could not parse search results!')
    const window = getJQWindow(resp)

    const accountInfoQ = window.$(
        '#middle > table.accountSummary > tbody > tr:nth-child(2)'
    )

    const nameQ = accountInfoQ?.find(
        'td:nth-child(2) > table > tbody > tr:first-child'
    )
    const owner = nameQ?.[0]?.textContent
        ?.trim()
        ?.split(' ')
        ?.slice(1)
        ?.join(' ')

    const addressQ = accountInfoQ?.find(
        'td:nth-child(1) > table > tbody > tr:nth-child(4) > td'
    )
    const address = addressQ
        ?.get(0)
        ?.textContent?.replace(/\,\s*$/, '')
        ?.replace(/^situs\s+/i, '')
        ?.toLowerCase()
        ?.trim()

    const street = address.split(',')?.[0]?.trim()
    const city = address.split(',')?.[1]?.trim()

    if ([owner, city, street].some((n) => !n)) {
        throw e // throw if any are empty
    }

    return {
        owner,
        street,
        city,
        coords: ``,
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
