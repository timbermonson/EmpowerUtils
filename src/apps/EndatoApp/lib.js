import { uniq, max, compact, cloneDeep, sortBy } from 'lodash-es'
import Ajv from 'ajv'
import axios from 'axios'
import config from 'config'
import Fuse from 'fuse.js'

import {
    lm,
    lo,
    getFuzzyCityMatch,
    awaitConsoleInput,
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

function hasAddressFuzzyMatch(address, searchList) {
    const { city: cityRaw, street } = address

    const city = getFuzzyCityMatch(cityRaw)

    const fuseOptions = {
        isCaseSensitive: false,
        includeScore: true,
        ignoreDiacritics: true,
        // shouldSort: true,
        // includeMatches: false,
        findAllMatches: true,
        minMatchCharLength: 3,
        // location: 0,
        threshold: 0.2,
        // distance: 100,
        // useExtendedSearch: false,
        ignoreLocation: true,
        ignoreFieldNorm: false,
        // fieldNormWeight: 1,
        keys: ['city', 'street'],
    }
    const fuse = new Fuse(searchList, fuseOptions)

    const streetResult = fuse.search(`${street}`)
    const cityResult = fuse.search(`${city}`)

    if (streetResult.length && cityResult.length) {
        return true
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

async function getEnrichedContact(person, simulatedResponse = false) {
    const personAddress = person.addressList[0]
    const apiSearchBody = convertToApiSearchBody(person)

    lm('-------------------------------')
    lo(apiSearchBody)
    lm('-------------------------------')
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
    if (!hasAddressFuzzyMatch(personAddress, apiPerson.addresses)) {
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
    enrichedContact.address =
        `${latestAddr.street} ${latestAddr.unit}, ${latestAddr.city}, ${latestAddr.state} ${latestAddr.zip}`
            .trim()
            .replaceAll(' ,', ',')
            .replaceAll(/\s+/g, ' ')

    if (!hasAddressFuzzyMatch(personAddress, [latestAddr])) {
        enrichedContact.noteList.push(
            "Prev. addr matched parcel record lookup, but this most-recent addr doesn't"
        )
    }

    return enrichedContact
}

export { assertPersonMapSchema, getEnrichedContact }
