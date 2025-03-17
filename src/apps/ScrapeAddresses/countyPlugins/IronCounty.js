import { compact } from 'lodash-es'
import qs from 'qs'

import {
    getJQWindow,
    getWebpage,
    nameCommaReverse,
    SearchStatus,
    lm,
} from '../../../utils/lib.js'
import searchFullNameFactory from './searchFullNameFactory.js'

// Search Page: https://eagleweb.ironcounty.net/eaglesoftware/taxweb/search.jsp

function getUniqIdWebpageFactory(id) {
    const baseUrl =
        'https://eagleweb.ironcounty.net/eaglesoftware/taxweb/account.jsp'
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
        'https://eagleweb.ironcounty.net/eaglesoftware/taxweb/results.jsp'

    const options = {
        method: 'POST',
        data: qs.stringify({
            OwnerIDSearchString: nameCommaReverse(fullName),
            OwnerIDSearchType: 'Normal',
            AllDocuments: 'ALL',
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
    const owner = nameQ?.[0]?.textContent
        ?.trim()
        ?.split(' ')
        ?.slice(1)
        ?.join(' ')

    let addressQ = accountInfoQ?.find(
        'td:nth-child(1) > table > tbody > tr:nth-child(5) > td'
    )

    let addressList = []
    if (addressQ.get(0).textContent.replace(/^Situs /, '').length < 5) {
        addressQ = accountInfoQ?.find(
            'td:nth-child(2) > table > tbody > tr:nth-child(2)'
        )
        addressList = addressQ?.[0]?.innerHTML
            ?.replaceAll(/<\/*(([^b>][^r>])|(\w))>/g, '')
            ?.split(/<br>|,/)
            ?.map((n) => n?.trim())
        addressList.pop()
    } else {
        address = addressQ?.[0]?.textContent?.trim()
        addressList = address?.split(',')?.map((n) => n?.trim())
    }

    const city = addressList?.[addressList?.length - 1]
    addressList?.pop()
    const street = addressList
        ?.join(', ')
        ?.replace(/situs/i, '')
        .replaceAll(/\s+/g, ' ')

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
