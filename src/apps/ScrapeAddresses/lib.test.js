import * as utilLib from '../../utils/lib.js'
vi.mock('../../utils/lib.js', { spy: true })

import countyScraperMap from './countyPlugins/index.js'
vi.mock('./countyPlugins/index.js', () => {
    return { default: { countyA: vi.fn(), countyB: vi.fn() } }
})

import {
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
    streetsAreSimilar,
} from './lib'

describe('Address Scraper library', () => {
    const testMap = {
        a: {
            fullName: 'a',
            addressList: [
                { city: 'beeptown', street: 'astreet' },
                { city: 'beeptown', street: 'aroad' },
                { city: 'boopville', street: 'aroad' },
            ],
        },
        b: {
            fullName: 'b',
            addressList: [{ city: 'beeptown', street: 'astreet' }],
        },
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('citiesAreSimilar()', () => {
        test('Handles empty inputs', () => {
            expect(citiesAreSimilar()).toEqual(true)
            expect(citiesAreSimilar('')).toEqual(false)
            expect(citiesAreSimilar('', '')).toEqual(true)
        })

        test('Rejects non-matches', () => {
            expect(citiesAreSimilar('cityTown', 'cityTowns')).toEqual(false)
        })

        test('Norms & detects matches', () => {
            expect(citiesAreSimilar('    cityTown', 'CITYTOWN   ')).toEqual(
                true
            )
        })
    })

    describe('getCountyCityCorrelationScore()', () => {
        test('Handles 0 names', () => {
            expect(getCountyCityCorrelationScore({})).toStrictEqual(0)
            expect(getCountyCityCorrelationScore(testMap)).toStrictEqual(0)
            expect(getCountyCityCorrelationScore(testMap, '')).toStrictEqual(0)
        })

        test('Handles non-matching cityname', () => {
            expect(
                getCountyCityCorrelationScore(testMap, 'notACity')
            ).toStrictEqual(0)
        })

        test('Scores singly-correlated city', () => {
            expect(
                getCountyCityCorrelationScore(testMap, 'boopVille   ')
            ).toStrictEqual(1)
        })

        test('Scores multi-correlated city', () => {
            expect(
                getCountyCityCorrelationScore(testMap, ' BEEPTOWN   ')
            ).toStrictEqual(2)
        })
    })

    describe('getMostCorrelatedAddress()', () => {
        test('Handles empty inputs', () => {
            expect(getMostCorrelatedAddress()).toEqual(undefined)
            expect(getMostCorrelatedAddress(testMap)).toEqual(undefined)
            expect(getMostCorrelatedAddress({}, '')).toEqual(undefined)
            expect(
                getMostCorrelatedAddress({ a: { addressList: [] } }, '')
            ).toEqual(undefined)
        })

        test('Handles 0 addresses ')
    })
})
