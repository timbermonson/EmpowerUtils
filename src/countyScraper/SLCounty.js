import {
    nameCommaReverse,
    SearchStatus,
    encodeUrl,
    getWebpage,
} from '../lib.js'

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
    // find page title
    const pageTitleMatch = `${resp}`.match(/id\=\"MainTitle\".+\>(.+)\</)

    if (!pageTitleMatch || !pageTitleMatch.length) {
        return SearchStatus.ERROR
    }
    const pageTitle = pageTitleMatch[1].trim().toLowerCase()

    // handle cases
    if (pageTitle === 'parcel details') {
        return SearchStatus.FOUND_SINGLE
    }

    if (pageTitle === 'parcel search results') {
        if (resp.includes('Your search returned no results'))
            return SearchStatus.NONE
        if (resp.match(/Your search found/s)) return SearchStatus.FOUND_MULTIPLE
    }

    return SearchStatus.ERROR
}

function parseMultiResultUniqIdList(resp) {
    const parcelListMatch = [...`${resp}`.matchAll(/parcel_id\,([0-9]+)\"/g)]

    if (
        !parcelListMatch ||
        !parcelListMatch.length ||
        !parcelListMatch[0].length
    ) {
        return []
    }

    let parcelIdList = []
    parcelListMatch.forEach((result) => {
        parcelIdList.push(result[1])
    })

    return parcelIdList
}

function parseSingleResultAddress(resp) {
    const streetMatch = `${resp}`.match(/Address<\/td>.+right;\"\>(.+)<\/td>/)
    const cityMatch = `${resp}`.match(
        /Tax District location<\/td>.+right;\"\>(.+)\/\w<\/td>/
    )

    const ownerMatch = `${resp}`.match(/Owner.*<\/td>.+right\"\>(.+)<\/td>/)

    const latMatch = `${resp}`.match(/id="polyx" hidden="true">([0-9\-\.]+)</)
    const longMatch = `${resp}`.match(/id="polyy" hidden="true">([0-9\-\.]+)</)

    if (
        !streetMatch ||
        !streetMatch[1] ||
        !cityMatch ||
        !cityMatch[1] ||
        !ownerMatch ||
        !ownerMatch[1] ||
        !latMatch ||
        !latMatch[1] ||
        !longMatch ||
        !longMatch[1]
    ) {
        throw new Error(`could not parse search results!`)
    }

    return {
        owner: ownerMatch[1].trim(),
        street: streetMatch[1].trim(),
        city: cityMatch[1].trim(),
        coords: `${latMatch[1].trim()}, ${longMatch[1].trim()}`,
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
