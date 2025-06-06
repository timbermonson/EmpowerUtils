import { uniq, max, compact, cloneDeep } from 'lodash-es'
import chalk from 'chalk'
import Fuse from 'fuse.js'

import lib from '../../lib/index.js'

const { lm } = lib.io
const { prepAddressSearchTerm } = lib.str

function pickRandom<T>(list: Array<T>) {
    return list[Math.floor(Math.random() * list.length)]
}

function prepStreetSearchList(strList: string[]) {
    return strList.map((str) => prepAddressSearchTerm(str))
}

function fuzzyStreetCompare(
    unpreppedStreet1: string,
    unpreppedStreet2: string
) {
    const searchResult1 = fuzzyStreetSearch(
        [unpreppedStreet1],
        unpreppedStreet2
    )
    const searchResult2 = fuzzyStreetSearch(
        [unpreppedStreet2],
        unpreppedStreet1
    )

    if (searchResult1.length) return searchResult1[0]
    if (searchResult2.length) return searchResult2[0]
    return false
}

function citiesAreSimilar(city1?: string, city2?: string) {
    // Within the same county, all addresses come from the same dataset with the same weird names.
    // Thus, simple string matching is good enough.
    return city1?.toLowerCase()?.trim() === city2?.toLowerCase()?.trim()
}

function fuzzyStreetSearch(searchList: string[], searchTerm: string) {
    const fuseOptions = {
        isCaseSensitive: false,
        includeScore: true,
        ignoreDiacritics: true,
        findAllMatches: true,
        minMatchCharLength: 3,
        threshold: 0.35,
        ignoreLocation: true,
        ignoreFieldNorm: false,
    }

    const fuse = new Fuse(prepStreetSearchList(searchList), fuseOptions)
    const fuseResult = fuse.search(
        prepAddressSearchTerm(searchTerm, {
            removeSingleLetters: true,
            removeStreetNum: true,
        })
    )

    return fuseResult.map(({ item }) => item)
}

function hasAddressInCity(addressList: D_Address[], cityName: string) {
    return !!addressList.find(({ city }) => citiesAreSimilar(city, cityName))
}

function getCountyCityCorrelationScore(
    searchresultMapByName: D_SearchResultMapByName,
    cityName: string
) {
    const addressListList = Object.values(searchresultMapByName)
        .map(({ addressList }) => addressList)
        .filter((addressList) => addressList?.length)

    const addressListsWithEntryInCity = addressListList.filter((addressList) =>
        hasAddressInCity(addressList, cityName)
    )

    const cityCorrelationScore = addressListsWithEntryInCity.length
    return cityCorrelationScore
}

function getAllAddresses(searchresultMapByName: D_SearchResultMapByName) {
    const addressList = []
    for (const name in searchresultMapByName) {
        addressList.push(...searchresultMapByName[name].addressList)
    }
    return addressList
}

function getMostCorrelatedAddress(
    searchresultMapByName: D_SearchResultMapByName,
    name: string
) {
    if (!searchresultMapByName || !name) return
    // Temporarily remove the person's addressList so it doesn't get matched against itself
    const addressList = searchresultMapByName[name].addressList
    if (!addressList.length) return
    searchresultMapByName[name].addressList = []

    // Step 1: Get the most correlated addresses by city
    const cityList = uniq(addressList.map(({ city }) => city))

    const cityScoreObjectList = cityList.map((city) => {
        return {
            name: city,
            score: getCountyCityCorrelationScore(searchresultMapByName, city),
        }
    })

    const maxCorrelationScore = max(
        cityScoreObjectList.map(({ score }) => score)
    )

    const cityNamesWithMaxCorrelation = cityScoreObjectList
        .filter(({ score }) => score === maxCorrelationScore)
        .map(({ name }) => name)

    const addressListMaxCityCorrelation = addressList.filter(({ city }) =>
        cityNamesWithMaxCorrelation.includes(city)
    )

    // Step 2: For each of those, try to find a fuzzy street match in the same city
    const allOtherAddressList = getAllAddresses(searchresultMapByName)
    const streetCorrelatedAddressList = addressListMaxCityCorrelation.filter(
        ({ city, street }) => {
            const matchingCityAddressStreetList = allOtherAddressList
                .filter((address) => citiesAreSimilar(address.city, city))
                .map(({ street }) => street)

            if (!matchingCityAddressStreetList.length) return false

            const fuzzyStreetMatchList = fuzzyStreetSearch(
                matchingCityAddressStreetList,
                street
            )

            return fuzzyStreetMatchList.length > 0
        }
    )

    const hasStreetCorrelations = !!streetCorrelatedAddressList.length

    const bestAddress = hasStreetCorrelations
        ? pickRandom(streetCorrelatedAddressList)
        : pickRandom(addressListMaxCityCorrelation)

    searchresultMapByName[name].addressList = addressList
    return bestAddress
}

function getNameListSortedByNumAddr(
    searchresultMapByName: D_SearchResultMapByName
) {
    return Object.keys(searchresultMapByName || {}).sort(
        (a, b) =>
            searchresultMapByName[b]?.addressList?.length -
            searchresultMapByName[a]?.addressList?.length
    )
}

function filterAllAddressListsToBest(inputMap) {
    const searchresultMapByName = cloneDeep(inputMap)

    const nameListSortedNumAddr = getNameListSortedByNumAddr(
        searchresultMapByName
    )

    // Iterate over the names by order of most addresses to least
    for (let i = 0; i < nameListSortedNumAddr.length; i += 1) {
        const name = nameListSortedNumAddr[i]
        const bestAddress = getMostCorrelatedAddress(
            searchresultMapByName,
            name
        )

        searchresultMapByName[name].addressList = compact([bestAddress])
    }

    return searchresultMapByName
}

function getCountyResultScore(searchresultMapByName: D_SearchResultMapByName) {
    let score = 0

    for (const fullName in searchresultMapByName) {
        const addressList = searchresultMapByName[fullName].addressList
        if (addressList?.length) score += 1
    }

    return score
}

function getCountyCityList(searchresultMapByName: D_SearchResultMapByName) {
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

function getCountyCorrelationScore(
    searchresultMapByName: D_SearchResultMapByName
) {
    const cityList = getCountyCityList(searchresultMapByName)

    let highestCityCorrelation = -1
    for (const city of cityList) {
        const correlation = getCountyCityCorrelationScore(
            searchresultMapByName,
            city
        )
        if (correlation > highestCityCorrelation) {
            highestCityCorrelation = correlation
        }
    }

    if (highestCityCorrelation < 2) highestCityCorrelation = 0
    return highestCityCorrelation
}

function countyHasSimilarAddressPair(
    searchresultMapByName: D_SearchResultMapByName
) {
    const nameList = Object.keys(searchresultMapByName)

    // Compare every pair once
    for (let i = 0; i < nameList.length; i += 1) {
        for (let j = i + 1; j < nameList.length; j += 1) {
            const address1 = searchresultMapByName[nameList[i]].addressList[0]
            const address2 = searchresultMapByName[nameList[j]].addressList[0]

            if (!address1 || !address2) continue
            if (!citiesAreSimilar(address1.city, address2.city)) continue

            if (
                !!fuzzyStreetCompare(address1.street, address2.street) &&
                address1.street.trim().toLowerCase() !==
                    address2.street.trim().toLowerCase()
            ) {
                return true
            }
        }
    }

    return false
}

function getAllCountyScoreList(nameSearchresultMapByCounty: D_CountyResultMap) {
    let scoreObjectList = []
    for (const countyName in nameSearchresultMapByCounty) {
        const searchresultMapByName = nameSearchresultMapByCounty[countyName]
        const correlation = getCountyCorrelationScore(searchresultMapByName)
        const result = getCountyResultScore(searchresultMapByName)

        const scoreObject = {
            countyName,
            correlation,
            result,
            sum: correlation + result,
        }

        scoreObjectList.push(scoreObject)
    }

    return scoreObjectList
}

/*
Take a map of 
{ 
    "countyName": {
        "personName":{
            "addressList": [(multiple addresses)]
        }
    }
}
And BOTH: narrow down people's address lists to 1 "best", and pick the best county.
Resulting in a map like:
{
    "personName":{
        "addressList": [(one address)]
    }
}

County Scoring Procedure:

    ------PRIOR------- 
    each person in each county must have 1 address result. 

    Procedure:
    • Go down the list of people, in order from most -> least address-results.
    • For each person:
        - re-generate the county's {cityName: correlationScore} map.
        - pick the addresses with the highest correlationScores, and tiebreak randomly.
    -------------------

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
function pickBestCountyAndAddresses(
    nameSearchresultMapByCounty: D_CountyResultMap
) {
    if (!Object.keys(nameSearchresultMapByCounty || {}).length) return {}
    // Step 1: modify nameSearchresultMapByCounty:
    //  For each person in each county, add a "bestAddress" attribute,
    //      ...containing the best address according to the County Cleanup procedure.

    for (const countyName in nameSearchresultMapByCounty) {
        nameSearchresultMapByCounty[countyName] = filterAllAddressListsToBest(
            nameSearchresultMapByCounty[countyName]
        )
    }

    // Step 2: Compare counties by score.

    // a) Assign each county the following scores:
    // - regular (number of people with addresses)
    // - correlation (max number of people in the same city)
    let scoreObjectList = getAllCountyScoreList(nameSearchresultMapByCounty)

    scoreObjectList.forEach((scoreObject) => {
        lm(`[${scoreObject.countyName}]`)
        lm(`\tCity Correlation:\t${scoreObject.correlation}`)
        lm(`\tPeople w/ Addrs:\t${scoreObject.result}`)
        lm(`\tTotal sum score:\t${scoreObject.sum}`)
    })

    // b) If any counties have a correlation >= 3, ignore all below.
    if (scoreObjectList.find(({ correlation }) => correlation >= 3)) {
        lm('Dropping all with correlation < 3!')

        scoreObjectList = scoreObjectList.filter(
            ({ correlation }) => correlation >= 3
        )
    }

    // c) For counties with correlation === 2, give +3 regular bonus if they have a similar address pair
    scoreObjectList
        .filter(({ correlation }) => correlation === 2)
        .forEach((scoreObj) => {
            if (
                countyHasSimilarAddressPair(
                    nameSearchresultMapByCounty[scoreObj.countyName]
                )
            ) {
                lm(
                    `[${scoreObj.countyName}]: +2 total score for similar streetnames!`
                )
                scoreObj.sum += 3
            }
        })

    // d) Pick the highest scorers, and break ties at-random.
    const highestScore = max(scoreObjectList.map(({ sum }) => sum))
    const highestScorerList = scoreObjectList.filter(
        ({ sum }) => sum === highestScore
    )
    const winningCountyName = pickRandom(highestScorerList).countyName
    lm(`\nWinner: `, chalk.cyan(`[${winningCountyName}]`))

    return nameSearchresultMapByCounty[winningCountyName]
}

export {
    citiesAreSimilar,
    countyHasSimilarAddressPair,
    filterAllAddressListsToBest,
    getAllAddresses,
    getAllCountyScoreList,
    getCountyCityCorrelationScore,
    getCountyResultScore,
    getMostCorrelatedAddress,
    getNameListSortedByNumAddr,
    hasAddressInCity,
    pickBestCountyAndAddresses,
}

export default { pickBestCountyAndAddresses }
