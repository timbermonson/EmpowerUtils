import config from 'config'
import {
    uniq,
    compact,
    max,
    filter,
    pickBy,
    map,
    mapValues,
    add,
} from 'lodash-es'
import fs from 'fs'

import { lm, lo, setupIOTextFiles } from '../../utils/lib.js'
// import { contactEnrichCall } from './lib.js'

const inputFilePath = config.get('ioFiles.inputPath')
const outputFilePath = config.get('ioFiles.outputPath')

setupIOTextFiles()

function readFileInput(filePath) {
    return fs.readFileSync(filePath, 'utf8')
}

function parseInput(inputContent) {
    const inputSplit = inputContent.trim().split('\n')
    const inputSanitizedList = compact(uniq(inputSplit.map((n) => n.trim())))

    const objectList = inputSanitizedList.map((n) => JSON.parse(n))

    return objectList
}

function getCountyResultScore(searchresultMapByName) {
    let score = 0

    for (const fullName in searchresultMapByName) {
        const addressList = searchresultMapByName[fullName].addressList
        if (addressList?.length) score += 1
    }

    return score
}

function getCountyCityList(searchresultMapByName) {
    let completeAddressList = []

    Object.values(searchresultMapByName)
        .map(({ addressList }) => addressList)
        .filter((addressList) => addressList?.length)
        .forEach(
            (addressList) =>
                (completeAddressList = completeAddressList.concat(addressList))
        )

    const cityList = compact(uniq(completeAddressList.map(({ city }) => city)))

    return cityList
}

function hasAddressInCity(addressList, cityName) {
    return !!addressList.find(({ city }) => city === cityName)
}

function getCountyCityCorrelationScore(searchresultMapByName, cityName) {
    const addressListList = Object.values(searchresultMapByName)
        .map(({ addressList }) => addressList)
        .filter((addressList) => addressList?.length)

    const addressListsWithEntryInCity = addressListList.filter((addressList) =>
        hasAddressInCity(addressList, cityName)
    )

    const cityCorrelationScore = addressListsWithEntryInCity.length
    return cityCorrelationScore
}

function getCountyCityCorrelationScoreMap(searchresultMapByName) {
    const cityList = getCountyCityList(searchresultMapByName)
    const cityCorrelationScoreMap = {}

    for (const cityName of cityList) {
        cityCorrelationScoreMap[cityName] = getCountyCityCorrelationScore(
            searchresultMapByName,
            cityName
        )
    }

    return cityCorrelationScoreMap
}

function addBestAddresses(searchresultMapByName) {
    const nameList = Object.keys(searchresultMapByName)
    lo(nameList)
}

function addBestAddressesByCounty(nameSearchresultMapByCounty) {
    for (const countyName in nameSearchresultMapByCounty) {
        addBestAddresses(nameSearchresultMapByCounty[countyName])
    }
}

/*
County Cleanup
Before scoring, each person in each county must have 1 address result. 

Procedure:
• Go down the list of people, in order from most -> least address-results.
• For each person:
    - re-generate the county's {cityName: correlationScore} map.
    - pick the addresses with the highest correlationScores, and tiebreak randomly.
*/

/*
County Scoring Procedure:
Each county is assigned two scores: cor & reg.
cor: corellation score. Equal to the number of people who live in the same city.
reg: regular score. Equal to the total number of people for whom there are results.

For example, a county with 5 results in the same city has reg:5/cor:5
And a county with 5 results in all different cities has reg:5/cor:0

Comparison rules:
- If ANY have cor >= 3, all with cor < 3 are disregarded.
- If cor = 2, but the two street-addresses "fuzzy-match", the county gets +3 reg points.
- Comparison is done based on the sum of each county's reg+cor.
- Ties are broken via coinflip.
*/
function getBestNameAddressMap(nameSearchresultMapByCounty) {
    // Step 1: modify nameSearchresultMapByCounty:
    //  For each person in each county, add a "bestAddress" attribute,
    //      ...containing the best address according to the County Cleanup procedure.

    addBestAddressesByCounty(nameSearchresultMapByCounty)

    // Step 2: Choose the best county-name-address map according to the County Scoring Procedure.
    // Step 3: Map results to be an array of objects like [{fullName:"", address:{city,street}}]
}

async function run() {
    const inputContent = readFileInput(inputFilePath)
    const blobList = parseInput(inputContent)

    for (const nameSearchresultMapByCounty of blobList) {
        const listToApiSearch = getBestNameAddressMap(
            nameSearchresultMapByCounty
        )
    }
}

run()
