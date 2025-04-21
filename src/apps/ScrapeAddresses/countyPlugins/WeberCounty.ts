import { compact } from 'lodash-es'

import { I_ScraperPlugin } from '../../../lib/types/I_ScraperPlugin.js'
import lib from '../../../lib/index.js'

import searchFullNameFactory from './searchFullNameFactory.js'

const { getJQWindow, getWebpage, SearchStatus, encodeUrl } = lib.scraper
const { nameReverse } = lib.str

// Search page: https://webercountyutah.gov/parcelsearch/

const plugin: I_ScraperPlugin<string> = {
    getUniqIdWebpageFactory(id) {
        const baseUrl =
            'https://webercountyutah.gov/parcelsearch/ownership-info.php'
        const param = `id=${id}`

        return async function getUniqIdWebpage() {
            const resp = await getWebpage(baseUrl, {
                queryParamList: [param],
            })
            return resp
        }
    },

    getFullNameWebpageFactory(fullName) {
        const baseUrl = 'https://webercountyutah.gov/parcelsearch/results.php'
        const nameParam = `name=${encodeUrl(nameReverse(fullName)).replaceAll(
            '%20',
            '+'
        )}`

        return async function getFullNameWebpage() {
            const resp = await getWebpage(baseUrl, {
                queryParamList: ['type=name', nameParam],
            })
            return resp
        }
    },

    parseSearchStatus(respData) {
        const window = getJQWindow(respData)

        const singleResultQ = window.$(
            'div.panel-default > div.panel-heading:contains("Ownership Info")'
        )
        if (singleResultQ?.length === 1) {
            return SearchStatus.FOUND_RESULTPAGE
        }

        const resultTableQ = window.$(
            'div.panel-default > .panel-body > table > thead:contains("Parcel #")'
        )
        if (resultTableQ?.length !== 1) {
            return SearchStatus.ERROR
        }

        const resultTableRowsQ = resultTableQ.parent()?.find('tbody > tr')
        if (resultTableRowsQ?.length > 0) {
            return SearchStatus.FOUND_MULTIRESULTTABLE
        }
        return SearchStatus.NONE
    },

    parseMultiResultUniqIdList(respData) {
        const window = getJQWindow(respData)
        const tableQ = window
            .$(
                'div.panel-default > .panel-body > table > thead:contains("Parcel #")'
            )
            ?.parent()
            ?.find('tbody > tr > td:nth-child(1)')
        if (!tableQ?.length) {
            return []
        }

        const serialIdList = compact(
            [...tableQ].map((result) => result?.textContent?.trim())
        )
        if (!serialIdList.length) {
            return []
        }

        return serialIdList
    },

    parseResultPageAddress(respData) {
        const e = new Error('Could not parse search results!')
        const window = getJQWindow(respData)

        const addressQ = window
            .$('div.row > div > strong:contains("Property")')
            .parent()
            .parent()
            .find(':nth-child(2)')
        if (!addressQ?.[0]?.textContent?.trim()) {
            throw e
        }

        const addressRaw = addressQ[0].textContent.trim()
        const addressSplit = compact(
            addressRaw.split('\n').map((n) => n.trim())
        )
        if (addressSplit.length < 2) {
            throw e
        }
        const street = addressSplit[0]
        const city = `${addressSplit[1]}`.replace(/\s\d+$/, '')

        const ownerQ = window
            .$('div.row > div > strong:contains("Owner")')
            ?.parent()
            ?.parent()
            ?.find(':nth-child(2)')
        const owner = ownerQ?.[0]?.textContent?.trim()
        if (!owner) {
            throw e
        }

        return {
            owner: `${owner}`,
            street: `${street}`,
            city: `${city}`,
            coords: ``,
        }
    },
}

const searchFullName = searchFullNameFactory(plugin)
export default searchFullName
