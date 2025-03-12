import { uniq, max, compact, cloneDeep, sortBy } from 'lodash-es'
import Ajv from 'ajv'
import axios from 'axios'
import config from 'config'
import Fuse from 'fuse.js'

import {
    awaitConsoleInput,
    getFuzzyCityMatch,
    lm,
    lo,
    normalizeCardinalDirection,
    prepAddressSearchTerm,
} from '../../utils/lib.js'

const apiKeyName = config.get('endato.profileKeyName')
const apiKeyPassword = config.get('endato.profileKeyPassword')

const ajv = new Ajv()
const inputPersonMapKeyRegex = '^\\w[\\w\\s]+\\w$'
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

function assertPersonMapSchema(personMap) {
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

function convertToApiSearchBody(person) {
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

function apiAssertResponseSchema(response) {
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

async function apiContactEnrichCall(body) {
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
    address,
    searchList,
    { streetThreshold, cityThreshold } = {}
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
    return false
}

function apiGetLastReported(list) {
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

async function getConfirmation(query) {
    const inpRaw = await awaitConsoleInput(query)
    const inp = (inpRaw || '').trim().toLowerCase()
    if (inp !== 'y' && inp !== 'yes') throw new Error('Confirmation Refused!')
}

function stringifyApiAddress(apiAddress) {
    const unitNum = apiAddress.unit ? `#${apiAddress.unit}` : ''
    const output =
        `${apiAddress.street} ${unitNum}, ${apiAddress.city}, ${apiAddress.state} ${apiAddress.zip}`
            .trim()
            .replaceAll(' ,', ',')
            .replaceAll(/\s+/g, ' ')

    return output
}

function stringifyPersonAddress(apiAddress) {
    const output = `${apiAddress.street}, ${apiAddress.city}`
        .trim()
        .replaceAll(' ,', ',')
        .replaceAll(/\s+/g, ' ')

    return output
}

async function getEnrichedContact(person, simulatedResponse = false) {
    const personAddress = person.addressList[0]
    const apiSearchBody = convertToApiSearchBody(person)

    lm('-------------------------------')
    lo(apiSearchBody)
    lm('-------------------------------')
    if (simulatedResponse) lm('USING SIMULATED RESPONSE')
    await getConfirmation(
        'Does the above body look correct for an API search?\n'
    )

    const response =
        simulatedResponse || (await apiContactEnrichCall(apiSearchBody))
    lo(response.data)
    if (
        response?.data?.pagination?.totalResults === 0 &&
        response?.data?.pagination?.totalPages === 0
    ) {
        throw new Error('Endato did not have any matches!')
    }
    apiAssertResponseSchema(response)

    const apiPerson = response.data.person
    const apiFuzzyPrevAddr = getFuzzyAddressMatch(
        personAddress,
        apiPerson.addresses
    )
    if (!apiFuzzyPrevAddr) {
        throw new Error('Endato match did not have a fuzzy-matching address!')
    }

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
        !getFuzzyAddressMatch(personAddress, [latestAddr], {
            streetThreshold: 0.1,
        })
    ) {
        enrichedContact.noteList.push(
            `Prev. addr matched parcel record lookup, but this most-recent addr doesn't. Prev addr ${stringifyPersonAddress(
                personAddress
            )}`
        )
    }

    return enrichedContact
}

export { assertPersonMapSchema, getEnrichedContact }
