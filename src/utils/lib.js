import { compact, reverse, sortBy } from 'lodash-es'
import axios from 'axios'
import config from 'config'
import fs from 'fs'
import Fuse from 'fuse.js'
import jQuery from 'jquery'
import jsdom from 'jsdom'
import readline from 'readline'

const cityCountyMap = importJSON('./utils/cityCountyMap.json')

const { JSDOM } = jsdom

const inputFilePath = config.get('ioFiles.inputPath')
const outputFilePath = config.get('ioFiles.outputPath')

async function awaitConsoleInput(query) {
    // Credit for this goes to https://stackoverflow.com/a/50890409
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    return await new Promise((resolve) =>
        rl.question(query, (ans) => {
            rl.close()
            resolve(ans)
        })
    )
}

function importJSON(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(fileContent)
}

function getFuzzyCityMatch(cityName) {
    const cityNameList = Object.keys(cityCountyMap)

    const fuseOptions = {
        isCaseSensitive: false,
        includeScore: true,
        ignoreDiacritics: true,
        // shouldSort: true,
        // includeMatches: false,
        findAllMatches: true,
        minMatchCharLength: 3,
        // location: 0,
        threshold: 0.3,
        // distance: 100,
        // useExtendedSearch: false,
        ignoreLocation: true,
        ignoreFieldNorm: false,
        // fieldNormWeight: 1,
    }

    const fuse = new Fuse(cityNameList, fuseOptions)
    const fuseResult = reverse(sortBy(fuse.search(cityName), 'score'))

    const closestMatch = fuseResult[0]?.item || ''

    return closestMatch
}

function setupIOTextFiles() {
    ;[inputFilePath, outputFilePath].forEach((filePath) => {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '')
        }
    })
}

function getJQWindow(resp) {
    const { window } = new JSDOM(resp, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    })

    window.$ = jQuery(window)

    return window
}

function nameCommaReverse(fullName) {
    const nameList = compact(fullName.split(' '))

    const lastName = nameList[nameList.length - 1]
    const beginning = nameList.slice(0, nameList.length - 1).join(' ')

    const reversedName = `${lastName}, ${beginning}`

    return reversedName
}

function lo(inp) {
    console.log(JSON.stringify(inp, null, 2))
}

function lm(inp) {
    console.log(inp)
}

function le(error, message) {
    throw new Error(`${message}, Error msg: ${error.message}`)
}

const encodeUrl = encodeURIComponent

const SearchStatus = Object.freeze({
    ERROR: 'error',
    FOUND_MULTIRESULTTABLE: 'found_multiresulttable',
    FOUND_RESULTPAGE: 'found_resultpage',
    NONE: 'none',
})

async function getWebpage(
    baseUrl,
    { headers, data, queryParamList, method = 'GET', httpsAgent }
) {
    let urlAppendage = ''
    if (queryParamList && queryParamList.length) {
        urlAppendage = `?${queryParamList.join('&')}`
    }

    const url = `${baseUrl}${urlAppendage}`
    const options = {
        data,
        headers,
        httpsAgent,
        method,
        url,
        withCredentials: true,
    }

    const { data: response } = await axios(options)

    return response
}

export {
    awaitConsoleInput,
    encodeUrl,
    getFuzzyCityMatch,
    getJQWindow,
    getWebpage,
    le,
    lm,
    lo,
    nameCommaReverse,
    SearchStatus,
    setupIOTextFiles,
}
