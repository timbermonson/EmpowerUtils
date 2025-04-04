import { compact } from 'lodash-es'
import https from 'https'
import qs from 'qs'

import lib from '../../../lib/index.js'

import searchFullNameFactory from './searchFullNameFactory.js'

const { getJQWindow, getWebpage, SearchStatus } = lib.scraper
const { nameReverse } = lib.str

// Unfortunately have to disable SSL verification here.
// The tooele property search lacks an intermediate cert, and adding it would be a PITA
const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // (NOTE: this will disable client verification)
})

// Search Page: https://erecording.tooeleco.gov/eaglesoftware/taxweb/search.jsp

function getFullNameWebpageFactory(fullName) {
    const baseUrl =
        'https://erecording.tooeleco.gov/eaglesoftware/taxweb/results.jsp'

    const options = {
        httpsAgent,
        method: 'POST',
        data: qs.stringify({
            OwnerIDSearchString: nameReverse(fullName),
            OwnerIDSearchType: 'Normal',
            AllTypes: 'ALL',
            docTypeTotal: 4,
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

function getUniqIdWebpageFactory(id) {
    const baseUrl =
        'https://erecording.tooeleco.gov/eaglesoftware/taxweb/account.jsp'
    const param = `accountNum=${id}`
    const options = {
        httpsAgent,
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
        [...serialIdListQ].map((result) => result?.textContent?.trim())
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
    const owner = nameQ?.[0]?.textContent.replace(/^Owner Name /, '')

    const locationQ = accountInfoQ
        ?.find('td:first-child > table > tbody')
        ?.first()
    const houseNumberQ = locationQ.find(':contains("HouseNumber")')
    const streetNameQ = locationQ.find(':contains("StreetName")')
    const cityQ = locationQ.find(':contains("Tax District")')

    const streetHouseNumber = houseNumberQ?.[0].textContent.replace(
        /^HouseNumber /,
        ''
    )
    const streetName = streetNameQ?.[0].textContent.replace(/^StreetName /, '')
    const street = `${streetHouseNumber} ${streetName}`
    const city = cityQ?.[0].textContent.replace(/^Tax District \d - /, '')

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
