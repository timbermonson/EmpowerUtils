import { cloneDeep } from 'lodash-es'

import countyScraperMap from './countyPlugins/index.js'
vi.mock('./countyPlugins/index.js', () => {
    return { default: { countyA: vi.fn(), countyB: vi.fn() } }
})

import {
    citiesAreSimilar,
    filterAllAddressListsToBest,
    getCountyCityCorrelationScore,
    getCountyResultScore,
    getMostCorrelatedAddress,
    getNameListSortedByNumAddr,
    pickBestCountyAndAddresses,
} from './lib.js'

describe('Address Scraper library', () => {
    const looseAddressMatch1 = {
        city: ' beeptown',
        street: '123123 astreat north',
    } as D_Address
    const looseAddressMatch2 = {
        city: 'beepTOWN',
        street: 'astreet',
    } as D_Address

    const testMapEmpty = {
        a: {
            fullName: 'a',
            addressList: [],
        },
        b: {
            fullName: 'b',
            addressList: [],
        },
    } as D_SearchResultMapByName

    const testMap = {
        a: {
            fullName: 'a',
            addressList: [
                { city: 'beeptown', street: 'aroad' },
                { city: 'beeptown', street: 'astroad' },
                looseAddressMatch1,
                { city: 'beeptown', street: 'aroad' },
            ],
        },
        b: {
            fullName: 'b',
            addressList: [
                { city: 'boopville', street: 'arock' },
                looseAddressMatch2,
            ],
        },
        c: {
            fullName: 'c',
            addressList: [
                looseAddressMatch2,
                { city: 'noneVille', street: 'arock' },
                { city: 'boopville', street: 'aroad' },
            ],
        },
    } as D_SearchResultMapByName

    const testMapFiltered = {
        a: {
            fullName: 'a',
            addressList: [looseAddressMatch1],
        },
        b: {
            fullName: 'b',
            addressList: [looseAddressMatch2],
        },
        c: {
            fullName: 'c',
            addressList: [looseAddressMatch2],
        },
    } as D_SearchResultMapByName

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
            expect(getCountyCityCorrelationScore({}, '')).toStrictEqual(0)
            expect(getCountyCityCorrelationScore(testMap, '')).toStrictEqual(0)
        })

        test('Handles non-matching cityname', () => {
            expect(
                getCountyCityCorrelationScore(testMap, 'notACity')
            ).toStrictEqual(0)
        })

        test('Scores singly-correlated city', () => {
            expect(
                getCountyCityCorrelationScore(testMap, 'noneVille   ')
            ).toStrictEqual(1)
        })

        test('Scores multi-correlated city', () => {
            expect(
                getCountyCityCorrelationScore(testMap, ' BEEPTOWN   ')
            ).toStrictEqual(3)
        })
    })

    describe('getMostCorrelatedAddress()', () => {
        test('Handles empty inputs', () => {
            expect(getMostCorrelatedAddress(testMap, '')).toEqual(undefined)
            expect(getMostCorrelatedAddress({}, '')).toEqual(undefined)
        })

        test('Handles 0 addresses', () => {
            expect(
                getMostCorrelatedAddress({ a: { addressList: [] } }, 'a')
            ).toEqual(undefined)
        })

        test('Picks best city and street correlation', () => {
            expect(getMostCorrelatedAddress(testMap, 'a')).toEqual(
                looseAddressMatch1
            )
        })
    })

    describe('getCountyResultScore()', () => {
        test('Handles empty inputs', () => {
            expect(getCountyResultScore({})).toEqual(0)
        })

        test('Scores 0 results', () => {
            expect(getCountyResultScore(testMapEmpty)).toEqual(0)
        })

        test('Scores 1 result', () => {
            expect(getCountyResultScore({ a: testMap.a })).toEqual(1)
        })

        test('Scores 3 results', () => {
            expect(getCountyResultScore(testMap)).toEqual(3)
        })
    })

    describe('getNameListSortedByNumAddr()', () => {
        test('Handles empty inputs', () => {
            expect(getNameListSortedByNumAddr({})).toEqual([])
        })

        test('Handles 1 input', () => {
            expect(getNameListSortedByNumAddr({ a: testMap.a })).toEqual(['a'])
        })

        test('Handles 2 inputs', () => {
            expect(getNameListSortedByNumAddr(testMap)).toEqual(['a', 'c', 'b'])
        })
    })

    describe('filterAllAddressListsToBest()', () => {
        test('Handles empty inputs', () => {
            expect(filterAllAddressListsToBest({})).toEqual({})
        })

        test('Properly filters all address results', () => {
            expect(filterAllAddressListsToBest(testMap)).toEqual(
                testMapFiltered
            )
        })
    })

    describe('pickBestCountyAndAddresses()', () => {
        const countyGen = (
            name,
            cityName = `${name}${name}`,
            streetName = cityName
        ) => {
            return {
                [name]: {
                    fullName: name,
                    addressList: [{ city: cityName, street: streetName }],
                },
            }
        }

        test('Handles empty inputs', () => {
            expect(pickBestCountyAndAddresses({})).toEqual({})
        })

        test('Detects corr. >3 & ignores all lower despite total num results', () => {
            const countyMap = {
                countyA: cloneDeep(testMap),
                countyB: Object.assign(
                    {},
                    ...[
                        'a',
                        'b',
                        'c',
                        'd',
                        'e',
                        'f',
                        'g',
                        'h',
                        'i',
                        'j',
                        'k',
                    ].map((n) => countyGen(n))
                ),
            }

            expect(pickBestCountyAndAddresses(countyMap)).toEqual(
                countyMap.countyA
            )
        })

        test('When same corr., tiebreak on num people w/ results', () => {
            const countyMap = {
                countyA: cloneDeep(testMap),
                countyB: Object.assign(
                    cloneDeep(testMap),
                    ...['d', 'e', 'f', 'g', 'h', 'i', 'j', 'k'].map((n) =>
                        countyGen(n)
                    )
                ),
            }

            expect(pickBestCountyAndAddresses(countyMap)).toEqual(
                countyMap.countyB
            )
        })

        test('When both have corr=2, give +3 bonus for street fuzzmatch', () => {
            const cor2res4County = Object.assign(
                {},
                countyGen('a', 'sameCity', 'something'),
                countyGen('b', 'sameCity', 'different'),
                countyGen('c'),
                countyGen('d')
            )

            const cor2res2County = Object.assign(
                {},
                countyGen('a', 'sameCity', 'sameStreet'),
                countyGen('b', 'sameCity', '123 samestreat north')
            )

            const countyMap = {
                countyA: cor2res4County,
                countyB: cor2res2County,
            }

            expect(getCountyResultScore(countyMap.countyA)).toEqual(4)
            expect(getCountyResultScore(countyMap.countyB)).toEqual(2)

            expect(pickBestCountyAndAddresses(countyMap)).toEqual(
                countyMap.countyB
            )
        })

        test("When both have corr=2, don't give fuzzmatch bonus for identical streets", () => {
            const cor2res4County = Object.assign(
                {},
                countyGen('a', 'sameCity', 'something'),
                countyGen('b', 'sameCity', 'different'),
                countyGen('c'),
                countyGen('d')
            )

            const cor2res2County = Object.assign(
                {},
                countyGen('a', 'sameCity', 'sameStreet'),
                countyGen('b', 'sameCity', 'sameStreet')
            )

            const countyMap = {
                countyA: cor2res4County,
                countyB: cor2res2County,
            }

            expect(getCountyResultScore(countyMap.countyA)).toEqual(4)
            expect(getCountyResultScore(countyMap.countyB)).toEqual(2)

            expect(pickBestCountyAndAddresses(countyMap)).toEqual(
                countyMap.countyA
            )
        })
    })
})
