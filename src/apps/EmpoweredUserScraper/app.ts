import axios from 'axios'
import chalk from 'chalk'
import config from 'config'

const ccLoginInfo = config.get('empowered.condoCerts') as {
    username: string
    password: string
}

import lib from '../../lib/index.js'

const {
    appendOutputData,
    commandLineArgsWrapper,
    confirm,
    confirmWithOption,
    logSep,
    setupIOTextFiles,
    writeOutputData,
    lm,
} = lib.io

async function getUnitInfo(
    managementGroupId: string,
    associationId: string,
    unitID: D_Empowered_UnitSummary['UnitID']
) {
    const axiosOptions = {
        url: 'https://acs.mgmt.emphoa.com/condocerts/getUnitData',
        method: 'GET',
        params: {
            username: ccLoginInfo.username,
            password: ccLoginInfo.password,
            managementGroupId,
            associationId,
            unitID,
        },
    }

    const response = await axios(axiosOptions)

    return response.data as D_Empowered_UnitDetail
}

async function getUnitList(managementGroupId: string, associationId: string) {
    const axiosOptions = {
        url: 'https://acs.mgmt.emphoa.com/condocerts/getUnits',
        method: 'GET',
        params: {
            username: ccLoginInfo.username,
            password: ccLoginInfo.password,
            managementGroupId,
            associationId,
        },
    }

    const response = await axios(axiosOptions)

    return response.data as Array<D_Empowered_UnitSummary>
}

import lockboxOrgNameMap from '../../ioFiles/input.js'
import unitDump from '../../ioFiles/input2.js'

function getAddrString(unit: D_Empowered_UnitSummary) {
    let output = ''

    output += unit.Street1
    if (unit.Street2.length) {
        output += ' ' + unit.Street2
    }
    output += `, ${unit.City}, ${unit.State} ${unit.Zip}`
    return output
}

function getBillingAddrString(unit: D_Empowered_UnitSummary) {
    let output = ''

    output += unit.BillingStreet1
    if (unit.BillingStreet2.length) {
        output += ' ' + unit.BillingStreet2
    }
    output += `, ${unit.BillingCity}, ${unit.BillingState} ${unit.BillingZip}`
    return output
}

async function run() {
    setupIOTextFiles()
    commandLineArgsWrapper()
    writeOutputData('')
    const managementGroupId = 2165

    const lockboxList = Object.keys(unitDump)
    for (let i = 0; i < lockboxList.length; i++) {
        const lockbox = lockboxList[i]

        console.log(`Processing lockbox [${chalk.greenBright(lockbox)}]...`)

        const orgName: string = lockboxOrgNameMap[lockbox]
        const unitList = unitDump[lockbox]

        for (let j = 0; j < unitList.length; j++) {
            const unit: D_Empowered_UnitSummary = unitList[j]
            let excelLine: string = ''

            console.log(`Processing unit [${chalk.greenBright(unit.UnitID)}]`)

            let unitDetail: D_Empowered_UnitDetail
            try {
                unitDetail = await getUnitInfo(
                    `${managementGroupId}`,
                    lockbox,
                    unit.UnitID
                )
            } catch (e) {
                console.error(e)
                console.log(chalk.redBright('Fail!'))
                continue
            }

            const residentString = unit.Residents.length
                ? unit.Residents.map(
                      ({ FirstName, LastName }) => `${FirstName} ${LastName}`
                  ).join(', ')
                : ''
            const differentCityBoolString =
                unit.BillingZip !== unit.Zip ? 'true' : 'false'
            const differentStateBoolString =
                unit.BillingState !== unit.State ? 'true' : 'false'
            const sameUnitBoolString =
                unit.BillingStreet2.length &&
                unit.Street2.length &&
                unit.BillingStreet2 === unit.Street2
                    ? 'true'
                    : 'false'

            excelLine += orgName + '\t'
            excelLine += lockbox + '\t'
            excelLine += residentString + '\t'
            excelLine += getAddrString(unit) + '\t'
            excelLine += getBillingAddrString(unit) + '\t'
            excelLine += sameUnitBoolString + '\t'
            excelLine += differentCityBoolString + '\t'
            excelLine += differentStateBoolString + '\t'
            if (unitDetail.UnitInformation.length) {
                excelLine +=
                    unitDetail.UnitInformation[0].IsPrimaryOccupancy + '\t'
                excelLine += unitDetail.UnitInformation[0].IsSecondHome + '\t'
                excelLine += unitDetail.UnitInformation[0].IsRenter + '\t'
            }
            appendOutputData(excelLine + '\n')
        }
    }
}

run()
