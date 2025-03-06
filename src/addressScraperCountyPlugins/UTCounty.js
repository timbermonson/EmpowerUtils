import {
    encodeUrl,
    getJQWindow,
    getWebpage,
    nameCommaReverse,
    SearchStatus,
} from '../utils/lib.js'

import { compact } from 'lodash-es'
import searchFullNameFactory from './searchFullNameFactory.js'

function getUniqIdWebpageFactory(id) {
    const baseUrl = 'https://www.utahcounty.gov/landrecords/property.asp'
    const param = `av_serial=${id.replaceAll(':', '')}`

    return async function getUniqIdWebpage() {
        const resp = await getWebpage(baseUrl, {
            queryParamList: [param],
        })
        return resp
    }
}

function getFullNameWebpageFactory(fullName) {
    const baseUrl = 'https://www.utahcounty.gov/landrecords/NameSearch.asp'
    const param = `av_name=${encodeUrl(nameCommaReverse(fullName))}`

    return async function getFullNameWebpage() {
        const resp = await getWebpage(baseUrl, {
            queryParamList: [param, 'av_valid=...', 'Submit=++++Search++++'],
        })
        return resp
    }
}

function parseSearchStatus(resp) {
    const window = getJQWindow(resp)

    const singleResultQ = window.$('h1:contains("Property Information")')
    if (singleResultQ?.length === 1) {
        return SearchStatus.FOUND_RESULTPAGE
    }

    const pageHeaderQ = window.$(
        'h1:contains("Real Property owner  Name Search")'
    )
    if (!pageHeaderQ?.[0]) {
        return SearchStatus.ERROR
    }

    const resultTableHeaderQ = pageHeaderQ
        .parent()
        ?.find('strong:contains("Owner Name")')
    if (!resultTableHeaderQ?.[0]) {
        return SearchStatus.ERROR
    }

    const resultTableQ = resultTableHeaderQ
        .parent()
        ?.parent()
        ?.parent()
        ?.find('tr')
        ?.not(':first-child')

    if (resultTableQ?.length) {
        return SearchStatus.FOUND_MULTIRESULTTABLE
    }

    return SearchStatus.NONE
}

function parseMultiResultUniqIdList(resp) {
    const window = getJQWindow(resp)

    const pageHeaderQ = window.$(
        'h1:contains("Real Property owner  Name Search")'
    )
    if (!pageHeaderQ?.[0]) {
        return SearchStatus.ERROR
    }

    const resultTableHeaderQ = pageHeaderQ
        .parent()
        ?.find('strong:contains("Owner Name")')
    if (!resultTableHeaderQ?.[0]) {
        return SearchStatus.ERROR
    }

    const resultTableQ = resultTableHeaderQ
        .parent()
        ?.parent()
        ?.parent()
        ?.find('tr')
        ?.not(':first-child')
        ?.find('td:nth-child(2)')
    if (!resultTableQ?.length) return []

    const serialIdList = compact(
        [...resultTableQ]?.map((n) => n?.textContent?.trim())
    )

    return serialIdList
}

function parseResultPageAddress(resp) {
    const e = new Error('Could not parse search results!')
    const window = getJQWindow(resp)

    const pageHeaderQ = window.$('h1:contains("Property Information")')

    const addressQ = pageHeaderQ
        ?.parent()
        ?.find('table > tbody > tr:nth-child(3)')
    const address = addressQ?.[0]?.textContent
        ?.split(':')
        ?.slice(1)
        ?.join(':')
        ?.trim()

    const addressSplit = address?.split(' - ')
    const street = addressSplit?.[0]
    const city = addressSplit?.[1]?.split('\n')?.[0]

    const ownerQ = pageHeaderQ
        ?.parent()
        ?.find('.TabbedPanelsContent > table:nth-child(2) > tbody > tr')
    if (!ownerQ?.length) throw e

    const ownerStringList = compact(
        [...ownerQ].map((n) => n?.textContent?.trim())
    )
    const ownerDataList = ownerStringList
        .map((ownerDataRow) => {
            const ownerData = compact(
                ownerDataRow.split('\n').map((n) => n.trim())
            )
            return [...ownerData]
        })
        .filter((ownerData) => ownerData && ownerData.length === 2)
    const currentOwnerDataList = ownerDataList.filter((data) =>
        data[0].includes('...')
    )
    const currentOwnerList = currentOwnerDataList.map((n) => n[1])
    const owner = currentOwnerList.join(' & ')

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
