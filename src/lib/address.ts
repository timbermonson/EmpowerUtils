import { sortBy } from 'lodash-es'
import Fuse from 'fuse.js'

import { importJSON, lm } from './io.js'
import { prepAddressSearchTerm } from './string.js'

import cityCountyMap from './cityCountyMap.js'

function getFuzzyCityMatch(cityName: string) {
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
        threshold: 0.4,
        // distance: 100,
        // useExtendedSearch: false,
        // ignoreLocation: true,
        ignoreFieldNorm: false,
        // fieldNormWeight: 1,
    }

    let cityNameNormalized = prepAddressSearchTerm(
        cityName.replace(/\d+\s*$/, ''),
        { removeStreetNum: false }
    )
    if (cityNameNormalized.match(/slc/))
        cityNameNormalized = cityNameNormalized.replace('slc', 'salt lake city')
    if (cityNameNormalized.match(/wvc/))
        cityNameNormalized = cityNameNormalized.replace(
            'wvc',
            'west valley city'
        )

    const fuse = new Fuse(cityNameList, fuseOptions)
    const fuseResult = sortBy(fuse.search(cityNameNormalized), 'score')

    const closestMatch = fuseResult[0]?.item || ''
    if (!closestMatch.length) {
        lm(`FAILED TO MATCH CITY`)
        lm(cityName)
    }

    return closestMatch
}

export { prepAddressSearchTerm, getFuzzyCityMatch }
