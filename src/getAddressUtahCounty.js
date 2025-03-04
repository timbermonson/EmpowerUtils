import {
    nameCommaReverse,
    SearchStatus,
    encodeUrl,
    getWebpage,
    l,
    lm,
} from './lib.js'

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
    const singleResultMatch = `${resp}`.match(/<h1>Property Information<\/h1>/)
    if (singleResultMatch && singleResultMatch.length) {
        return SearchStatus.FOUND_SINGLE
    }

    // find page title
    const pageTitleMatch = `${resp}`.match(
        /<h1 align="left">Real Property owner  Name Search <\/h1\>/
    )
    if (!pageTitleMatch || !pageTitleMatch.length) {
        return SearchStatus.ERROR
    }

    const resultTableMatch = `${resp}`.match(/<table width="100%">/)
    if (!resultTableMatch || !resultTableMatch.length) {
        return SearchStatus.NONE
    }

    const resultListMatch = [
        ...`${resp}`.matchAll(/<td><a href="property\.asp[^>]+>([^<]+)/g),
    ]
    if (
        !resultListMatch ||
        !resultListMatch.length ||
        !resultListMatch.every((r) => r.length > 1)
    ) {
        return SearchStatus.NONE
    }
    return SearchStatus.FOUND_MULTIPLE
}

function parseMultiResultUniqIdList(resp) {
    const serialListMatch = [
        ...`${resp}`.matchAll(/<td><a href="property\.asp[^>]+>([^<]+)/g),
    ]

    if (
        !serialListMatch ||
        !serialListMatch.length ||
        !serialListMatch[0].length
    ) {
        return []
    }

    let serialIdList = []
    serialListMatch.forEach((result) => {
        serialIdList.push(result[1])
    })

    return serialIdList
}

function parseSingleResultAddress(resp) {
    const streetMatch = `${resp}`.match(/Property Address[^\n>]+>([^\n<-]+)/)
    const cityMatch = `${resp}`.match(
        /Property Address[^\n>]+>[^\n-]+-([^\n<]+)/
    )
    const ownerMatch = [
        ...`${resp}`.matchAll(/\.\.\.[^\?]+\?av_name[^>]+>([^<]+)/g),
    ]
    const latMatch = `${resp}`.match(/id="polyx" hidden="true">([0-9\-\.]+)</)
    const longMatch = `${resp}`.match(/id="polyy" hidden="true">([0-9\-\.]+)</)

    if (
        !streetMatch ||
        !streetMatch[1].replace('&nbsp;', '').trim() ||
        !cityMatch ||
        !cityMatch[1] ||
        !ownerMatch ||
        !ownerMatch[0]
    ) {
        throw new Error(`could not parse search results!`)
    }
    return {
        owner: ownerMatch.map((r) => r[1]).join(', '),
        street: streetMatch[1].trim().replace('&nbsp; ', ''),
        city: cityMatch[1].trim(),
        coords: ``,
    }
}

export async function searchFullName(fullName) {
    lm(`Getting address for ${fullName}...`)
    const getFullNameWebpage = getFullNameWebpageFactory(fullName)
    let status = ''
    let addressList = []
    let resp

    try {
        resp = await getFullNameWebpage()
        status = parseSearchStatus(resp)

        switch (status) {
            case SearchStatus.FOUND_SINGLE:
                lm('Found!')
                addressList = [parseSingleResultAddress(resp)]
                break
            case SearchStatus.FOUND_MULTIPLE:
                lm('Found Mulitple! Iterating...')
                const uniqIdList = parseMultiResultUniqIdList(resp)
                addressList = []
                for (const uniqId of uniqIdList) {
                    const uniqIdResult = await searchUniqId(uniqId)
                    if (uniqIdResult.status === SearchStatus.FOUND_SINGLE) {
                        addressList.push(uniqIdResult.addressList[0])
                    }
                }
                break
            case SearchStatus.NONE:
                lm('No results.')
                addressList = []
                break
            case SearchStatus.ERROR:
                lm('Search Failed!')
                addressList = []
                break
            default:
                addressList = []
                break
        }

        return { fullName, status, addressList }
    } catch (e) {
        lm(e)
        return { fullName, status: SearchStatus.ERROR, addressList: [] }
    }
}

async function searchUniqId(id) {
    lm(`Getting address for unique identifier ${id}...`)
    const getUniqIdWebpage = getUniqIdWebpageFactory(id)
    let status = ''
    let addressList = []
    let resp

    try {
        resp = await getUniqIdWebpage()

        status = parseSearchStatus(resp)
        switch (status) {
            case SearchStatus.FOUND_SINGLE:
                lm('Found!')
                addressList = [parseSingleResultAddress(resp)]
                break
            case SearchStatus.FOUND_MULTIPLE:
                lm('Found Mulitple! Skipping...')
                addressList = []
                break
            case SearchStatus.NONE:
                lm('No results.')
                addressList = []
                break
            case SearchStatus.ERROR:
                lm('Search Failed!')
                addressList = []
                break
            default:
                addressList = []
                break
        }

        return { status, addressList }
    } catch (e) {
        lm(e)
        return { status: SearchStatus.ERROR, addressList: [] }
    }
}
