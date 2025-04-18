import { compact, cloneDeep, sortBy } from 'lodash-es'
import { Ajv } from 'ajv'
import axios from 'axios'
import config from 'config'
import Fuse from 'fuse.js'

import lib from '../../lib/index.js'

const { lm, lo, logSep } = lib.io
const { normalizeCardinalDirection, prepAddressSearchTerm } = lib.str

const { getFuzzyCityMatch } = lib.address

const apiKeyName = config.get('endato.profileKeyName') as string
const apiKeyPassword = config.get('endato.profileKeyPassword') as string

const ajv = new Ajv()

const inputPersonMapKeyRegex = "^\\w[-\\w\\s\\.']+[\\w\\.]$"
const inputPersonMapSchema = {
    type: 'object',
    patternProperties: {
        [inputPersonMapKeyRegex]: {
            $ref: '#/$defs/person',
        },
    },
    additionalProperties: false,
    $defs: {
        person: {
            type: 'object',
            properties: {
                fullName: {
                    type: 'string',
                },
                addressList: {
                    type: 'array',
                    maxItems: 1,
                },
            },
            required: ['fullName', 'addressList'],
        },
    },
}
const contactEnrichApiResponseSchema = {
    type: 'object',
    properties: {
        status: {
            type: 'integer',
            const: 200,
        },
        data: {
            type: 'object',
            properties: {
                person: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'object',
                            properties: {},
                        },
                        addresses: {
                            type: 'array',
                            minItems: 1,
                        },
                    },
                    required: ['name', 'addresses'],
                },
            },
            required: ['person'],
        },
    },
    required: ['status', 'data'],
}
const apiResponseAjvValidator = ajv.compile(contactEnrichApiResponseSchema)
const personMapAjvValidator = ajv.compile(inputPersonMapSchema)

function assertPersonMapSchema(personMap: D_SearchResultMapByName) {
    const personMapIsValid = personMapAjvValidator(personMap)
    if (!personMapIsValid) {
        throw new Error(
            `Error validating Input Schema: ${JSON.stringify(
                personMapAjvValidator.errors || [],
                null,
                2
            )}`
        )
    }
}

function convertToApiSearchBody(
    person: D_PersonResult
): D_EndatoContactEnrichBody {
    const {
        fullName,
        addressList: [address],
    } = person

    const { city: cityRaw, street: streetRaw } = address
    const street = streetRaw.replace(/#.*$/, '').trim()
    const city = getFuzzyCityMatch(cityRaw)
    const addressLine2 = city.length ? `${city}, UT` : ''

    const nameList = compact(fullName.split(' '))
    const numNames = nameList.length
    const lastName = nameList[numNames - 1]
    const firstName = nameList.slice(0, numNames - 1).join(' ')

    return {
        FirstName: firstName,
        LastName: lastName,
        Address: {
            addressLine1: street,
            addressLine2,
        },
    }
}

function apiAssertResponseSchema(response: any) {
    const respIsValid = apiResponseAjvValidator(response)
    if (!respIsValid) {
        const errorList = (apiResponseAjvValidator.errors || []).map((er) => {
            er.message = `response${er.instancePath.replaceAll('/', '.')} ${
                er.message
            }`
            return er
        })
        throw new Error(
            `Error validating Endato API Response: ${JSON.stringify(
                errorList,
                null,
                2
            )}`
        )
    }
}

async function apiContactEnrichCall(body: D_EndatoContactEnrichBody) {
    try {
        const response = await axios({
            url: 'https://devapi.endato.com/Contact/Enrich',
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'galaxy-ap-name': apiKeyName,
                'galaxy-ap-password': apiKeyPassword,
                'galaxy-search-type': 'DevAPIContactEnrich',
            },
            data: body,
        })

        return response
    } catch (e) {
        return e.response
    }
}

function getFuzzyAddressMatch(
    address: D_Address,
    searchList: D_Address[],
    { streetThreshold = 0.6, cityThreshold = 0.6 } = {
        streetThreshold: 0,
        cityThreshold: 0,
    }
) {
    const { city: cityRaw, street } = address

    const city = getFuzzyCityMatch(cityRaw)

    const streetFuseOptions = {
        isCaseSensitive: false,
        includeScore: true,
        ignoreDiacritics: true,
        // shouldSort: true,
        // includeMatches: false,
        findAllMatches: true,
        minMatchCharLength: 3,
        // location: 0,
        threshold: streetThreshold || 0.6,
        // distance: 100,
        // useExtendedSearch: false,
        ignoreLocation: true,
        ignoreFieldNorm: false,
        // fieldNormWeight: 1,
        keys: ['city', 'street'],
    }
    const cityFuseOptions = cloneDeep(streetFuseOptions)
    cityFuseOptions.threshold = cityThreshold || 0.6

    const streetFuse = new Fuse(searchList, streetFuseOptions)
    const cityFuse = new Fuse(searchList, cityFuseOptions)

    const streetResult = streetFuse.search(
        normalizeCardinalDirection(
            prepAddressSearchTerm(street, {
                removeStreetNum: false,
                removeSingleLetters: false,
            })
        )
    )
    const cityResult = cityFuse.search(
        prepAddressSearchTerm(city.replace(/\d+\s*$/, ''))
    )

    if (streetResult.length && cityResult.length) {
        return streetResult[0].item
    }
    if (!street?.length && cityResult.length) {
        return cityResult[0].item
    }
    return false
}

function apiGetLastReported(list: any[]) {
    if (!list?.length) {
        return
    }
    const listSorted = sortBy(list, ({ lastReportedDate }) => {
        if (!lastReportedDate?.length) return 0
        const [month, day, year] = lastReportedDate.split('/')
        return `${year}${month}${day}`
    })

    return listSorted[listSorted.length - 1]
}

function stringifyApiAddress(apiAddress: any) {
    const unitNum = apiAddress.unit ? `#${apiAddress.unit}` : ''
    const output =
        `${apiAddress.street} ${unitNum}, ${apiAddress.city}, ${apiAddress.state} ${apiAddress.zip}`
            .trim()
            .replaceAll(' ,', ',')
            .replaceAll(/\s+/g, ' ')

    return output
}

function stringifyPersonAddress(apiAddress: any) {
    const output = `${apiAddress.street}, ${apiAddress.city}`
        .trim()
        .replaceAll(' ,', ',')
        .replaceAll(/\s+/g, ' ')

    return output
}

function apiAssertHasMatches(response: any) {
    if (apiHasNoMatches(response)) {
        throw new Error('Endato did not have any matches!')
    }
}

function apiHasNoMatches(response: any) {
    return (
        response?.data?.pagination?.totalResults === 0 &&
        response?.data?.pagination?.totalPages === 0
    )
}

function apiAssertHasFuzzyMatchAddress(
    personAddressOld: D_Address,
    apiPerson: any
) {
    const apiFuzzyPrevAddr = getFuzzyAddressMatch(
        personAddressOld,
        apiPerson.addresses
    )

    if (!apiFuzzyPrevAddr) {
        throw new Error('Endato match did not have a fuzzy-matching address!')
    }
}

function formatEnrichedContact(
    personAddressOld: D_Address,
    apiPerson: any
): D_EndatoContactFormatted {
    const enrichedContact = {
        firstName: apiPerson.name.firstName,
        lastName:
            `${apiPerson.name.lastName} ${apiPerson.name.middleName}`.trim(),
        phone: apiGetLastReported(apiPerson.phones)?.number || '',
        address: '',
        email: apiPerson.emails?.map(({ email }) => email)?.join(', '),
        noteList: [],
    }

    const latestAddr = apiGetLastReported(apiPerson.addresses)
    enrichedContact.address = stringifyApiAddress(latestAddr)

    if (
        !getFuzzyAddressMatch(personAddressOld, [latestAddr], {
            streetThreshold: 0.1,
        })
    ) {
        enrichedContact.noteList.push(
            `Prev. addr matched parcel record lookup, but this most-recent addr doesn't. Prev addr ${stringifyPersonAddress(
                personAddressOld
            )}`
        )
    }

    return enrichedContact
}

async function getEnrichedContact(
    person: D_PersonResult,
    simulatedResponse = false
) {
    const personAddressOld = person.addressList[0]
    const apiSearchBody = convertToApiSearchBody(person)

    logSep('[Searching]:')
    lo(apiSearchBody)
    logSep()
    if (simulatedResponse) lm('USING SIMULATED RESPONSE')

    let response =
        simulatedResponse || (await apiContactEnrichCall(apiSearchBody))

    lm('[RESPONSE DATA]')
    lo(response.data)

    apiAssertHasMatches(response)
    apiAssertResponseSchema(response)

    const apiPerson = response.data.person

    apiAssertHasFuzzyMatchAddress(personAddressOld, apiPerson)

    const enrichedContact = formatEnrichedContact(personAddressOld, apiPerson)

    return enrichedContact
}

export { assertPersonMapSchema, getEnrichedContact, convertToApiSearchBody }
