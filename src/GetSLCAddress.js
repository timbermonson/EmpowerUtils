import axios from 'axios'
import process from 'process'

function generateNameSearchString(name) {
    const nameList = name.split(' ')
    if (nameList.length === 3) {
        return `${nameList[nameList.length - 1]}%2C+${nameList[0]}%20${
            nameList[1]
        }`
    }
    return `${nameList[nameList.length - 1]}%2C+${nameList[0]}`
}

async function getSaltLakeCountyResultPageByNameString(nameString) {
    return await getSaltLakeCountyResultPageByAppendage(
        `itemname=${nameString}`
    )
}

async function getSaltLakeCountyResultPageByAppendage(appendage) {
    console.log(`Getting data for ${appendage}...`)
    const baseUrl =
        'http://apps.saltlakecounty.gov/assessor/new/resultsMain.cfm?'
    const url = `${baseUrl}${appendage}`
    const { data: resp } = await axios.get(url)

    const pageTitleMatch = `${resp}`.match(/id\=\"MainTitle\".+\>(.+)\</)
    if (!pageTitleMatch || !pageTitleMatch[1]) {
        throw new Error('Could not find page title')
    }
    const pageTitle = pageTitleMatch[1]

    switch (pageTitle) {
        case 'Parcel Search Results':
            let parcelIdList = []
            try {
                const parcelListMatch = [
                    ...`${resp}`.matchAll(/parcel_id\,([0-9]+)\"/g),
                ]
                parcelListMatch.forEach((result) => {
                    parcelIdList.push(result[1])
                })
            } catch {
                throw new Error('could not find result list on result page!')
            }

            const resultList = []
            for (const parcelId of parcelIdList) {
                const result = await getSaltLakeCountyResultPageByAppendage(
                    `parcelId=${parcelId}`
                )
                resultList.push(result)
            }
            return resultList
            break

        case 'Parcel Details':
            const streetMatch = `${resp}`.match(
                /Address<\/td>.+right;\"\>(.+)<\/td>/
            )
            const cityMatch = `${resp}`.match(
                /Tax District location<\/td>.+right;\"\>(.+)\/\w<\/td>/
            )
            const ownerMatch = `${resp}`.match(
                /Owner.*<\/td>.+right\"\>(.+)<\/td>/
            )
            const latMatch = `${resp}`.match(
                /id="polyx" hidden="true">([0-9\-\.]+)</
            )
            const longMatch = `${resp}`.match(
                /id="polyy" hidden="true">([0-9\-\.]+)</
            )

            if (
                !streetMatch ||
                !streetMatch[1] ||
                !cityMatch ||
                !cityMatch[1] ||
                !ownerMatch ||
                !ownerMatch[1] ||
                !latMatch ||
                !latMatch[1] ||
                !longMatch ||
                !longMatch[1]
            ) {
                throw new Error(
                    `could not parse search results for ${nameString}`
                )
            }
            return {
                owner: ownerMatch[1].trim(),
                street: streetMatch[1].trim(),
                city: cityMatch[1].trim(),
                coords: `${latMatch[1].trim()}, ${longMatch[1].trim()}`,
            }
            break
    }
    throw new Error('could not find results!')
}

export default async function getSaltLakeCountyResultPageByName(name) {
    const nameString = generateNameSearchString(name)

    return await getSaltLakeCountyResultPageByNameString(nameString)
}
