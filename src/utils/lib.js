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

function prepAddressSearchTerm(
    str,
    { removeStreetNum = true, removeSingleLetters = true } = {
        removeStreetNum: true,
        removeSingleLetters: true,
    }
) {
    let output = str
        .toLowerCase()
        .split('#')[0] // remove appt numbers
        .replaceAll(/[^A-ZA-z0-9\s]/g, '') // remove anything that isn't letters, numbers, or spaces
        .trim()
        .replaceAll(/\s+/g, ' ') // combine spaces
        .trim()
        .replace(/^(north|south|east|west)\s+/, '') // remove leftover direction from beginning of street address

    if (removeSingleLetters) {
        output = output.replaceAll(/(^|(?<=\s))\w(?=\s)/g, '') // remove any single letter bordered by spaces/starts
    }
    if (removeStreetNum) {
        output = output.replace(/^\s*\d+\W/, '') // remove street number
    }

    return output
}

async function awaitConsoleInput(query) {
    // Credit for this goes to https://stackoverflow.com/a/50890409
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
    })

    const answer = await new Promise((resolve) => {
        rl.question(query, resolve)
    })

    rl.close()

    return answer
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

    let cityNameNormalized = prepAddressSearchTerm(
        cityName.replace(/\d+\s*$/, ''),
        { removeStreetNum: false }
    )

    const fuse = new Fuse(cityNameList, fuseOptions)
    const fuseResult = sortBy(fuse.search(cityNameNormalized), 'score')

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

function normalizeCardinalDirection(addr) {
    return addr
        .replace(/west/i, 'w')
        .replace(/east/i, 'e')
        .replace(/north/i, 'n')
        .replace(/south/i, 's')
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
    normalizeCardinalDirection,
    prepAddressSearchTerm,
    SearchStatus,
    setupIOTextFiles,
}
