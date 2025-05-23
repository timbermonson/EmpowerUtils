import { I_ScraperPlugin } from '../../../lib/types/I_ScraperPlugin.js'
import lib from '../../../lib/index.js'

import searchFullNameFactory from './searchFullNameFactory.js'

const { getJQWindow, getWebpage, SearchStatus, encodeUrl } = lib.scraper
const { nameReverse } = lib.str

// Search page: https://emprep.wasatch.utah.gov/Property-Tax-Information-Lookup/Current-Year-Property-Tax-Lookup

type D_WasCountyID = {
    __EVENTTARGET: string
    __EVENTVALIDATION: string
    __VIEWSTATE: string
}

const plugin: I_ScraperPlugin<D_WasCountyID> = {
    getUniqIdWebpageFactory(identifier) {
        const baseUrl =
            'https://emprep.wasatch.utah.gov/Property-Tax-Information-Lookup/Current-Year-Property-Tax-Lookup'

        const form = new FormData()
        form.append('__EVENTTARGET', identifier.__EVENTTARGET)
        form.append('__EVENTVALIDATION', identifier.__EVENTVALIDATION)
        form.append('__VIEWSTATE', identifier.__VIEWSTATE)

        const options = {
            method: 'POST',
            data: form,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }

        return async function getUniqIdWebpage() {
            const resp = await getWebpage(baseUrl, options)
            return resp
        }
    },

    getFullNameWebpageFactory(fullName) {
        const baseUrl =
            'https://emprep.wasatch.utah.gov/Property-Tax-Information-Lookup/Current-Year-Property-Tax-Lookup'
        const param = `own=${encodeUrl(nameReverse(fullName, ' '))}`

        return async function getFullNameWebpage() {
            const resp = await getWebpage(baseUrl, {
                queryParamList: [param, 'parc=[^]', 'add=[^]', 'ser=[^]'],
            })
            return resp
        }
    },

    parseSearchStatus(respData) {
        const window = getJQWindow(respData)

        const pageHeaderQ = window.$(
            'span:contains("Current Tax Year Lookup Service")'
        )
        if (!pageHeaderQ) {
            return SearchStatus.ERROR
        }

        const singleResultQ = window.$('#printableArea')
        if (singleResultQ?.length === 1) {
            return SearchStatus.FOUND_RESULTPAGE
        }

        const parcelIdQ = window.$(
            'div > div > div > table > tbody > tr > td > ul > li:nth-child(1)'
        )
        if (!!parcelIdQ.length) {
            return SearchStatus.FOUND_MULTIRESULTTABLE
        }

        return SearchStatus.NONE
    },

    parseMultiResultUniqIdList(respData) {
        const window = getJQWindow(respData)

        const pageHeaderQ = window.$(
            'span:contains("Current Tax Year Lookup Service")'
        )
        if (!pageHeaderQ) {
            ;[]
        }

        const parcelIdQ = window.$(
            'div > div > div > table > tbody > tr > td > ul > li:nth-child(1)'
        )
        if (!parcelIdQ.length) {
            ;[]
        }

        const __VIEWSTATE = window.$('input#__VIEWSTATE').val()
        const __EVENTVALIDATION = window.$('input#__EVENTVALIDATION').val()
        if (!__VIEWSTATE || !__EVENTVALIDATION) {
            ;[]
        }

        const formBodyList: D_WasCountyID[] = []
        for (let index = 0; index < parcelIdQ.length; index += 1) {
            formBodyList.push({
                __EVENTTARGET: `dnn$ctr2961$XModPro$ctl00$ctl01$rptrListView$ctl0${
                    index + 1
                }$ctl00$_lnk`,
                __EVENTVALIDATION,
                __VIEWSTATE,
            })
        }

        return formBodyList
    },

    parseResultPageAddress(respData) {
        const e = new Error('Could not parse search results!')
        const window = getJQWindow(respData)

        const addressQ = window
            .$(
                'div#printableArea > table > tbody > tr:contains("Property (Grid)") > td:nth-child(2)'
            )
            ?.get(0)

        const address = addressQ?.textContent
        const addressSplit = address?.split(' ')
        const street = addressSplit?.slice(0, addressSplit.length - 1).join(' ')
        const city = addressSplit?.[addressSplit.length - 1]

        const ownerQ = window
            .$(
                'div#printableArea > table > tbody > tr:contains("Owner Name:") > td:nth-child(2)'
            )
            ?.get(0)
        const owner = ownerQ.textContent

        if ([owner, city, street].some((n) => !n)) {
            throw e // throw if any are empty
        }

        return {
            owner,
            street,
            city,
            coords: ``,
        }
    },
}

const searchFullName = searchFullNameFactory(plugin)
export default searchFullName
