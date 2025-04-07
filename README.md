<!-- prettier-ignore-start -->
````
  ______                                                          _    _   _     _   _       
 |  ____|                                                        | |  | | | |   (_) | |      
 | |__     _ __ ___    _ __     ___   __      __   ___   _ __    | |  | | | |_   _  | |  ___ 
 |  __|   | '_ ` _ \  | '_ \   / _ \  \ \ /\ / /  / _ \ | '__|   | |  | | | __| | | | | / __|
 | |____  | | | | | | | |_) | | (_) |  \ V  V /  |  __/ | |      | |__| | | |_  | | | | \__ \
 |______| |_| |_| |_| | .__/   \___/    \_/\_/    \___| |_|       \____/   \__| |_| |_| |___/
                      | |                                                                    
                      |_|
````                                                                                              
<!-- prettier-ignore-end -->

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Install](#install)
- [Now With Tests!](#now-with-tests)
- [Utils](#utils)
  - [Xero Community Auto-Navigator](#xero-community-auto-navigator)
    - [Example Screenshots](#example-screenshots)
  - [Business Principal Extractor](#business-principal-extractor)
- [Address Scraper](#address-scraper)
  - [Input Format](#input-format)
  - [Execution](#execution)
  - [Extra Options](#extra-options)
  - [Endato Searcher](#endato-searcher)
    - [Input Format](#input-format-1)
    - [Example Screenshots](#example-screenshots-1)
    - [Execution](#execution-1)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

A collection of utils written by Timber Monson for various tasks at an HOA management company.

These tools were written for automation, but the intent of this repo is to demonstrate proficiency in building quality codebases.

Basic usage guides are below.

## Install

**nvm & node**

- Windows: install "windows-nvm" by downloading "nvm-setup.exe" from [Here](https://github.com/coreybutler/nvm-windows/releases).
- Then, install the proper node version with `nvm install v22.14.0` and `nvm use v22.14.0`

- macOS: install "nvm" by following the instructions [Here](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating).
- macOS' nvm should auto-install & use the correct node version when you use `cd ./src`

**npm packages**

- Install npm/nodemon globally with `npm i -g nodemon`
- Set your cwd with `cd ./src` (do this before doing anything else, really)
- Clear out old packages with `rm -Force node_modules` on Windows, or `rm -rf node_modules` on mac.
- run `npm i` to install all packages.

## Now With Tests!

Try `npm run test` for verbose unit tests, and `npm run coverage` for a coverage report.

![image](https://github.com/user-attachments/assets/f3bad18c-71c9-4107-87f0-3843a42ac2b8)

![image](https://github.com/user-attachments/assets/1161a25d-3bad-4039-9b20-2700314724e2)

# Utils

## Xero Community Auto-Navigator

**This app**:
Works down a list of Xero organizations, auto-navigating to a selected page.

This helps automate the "navigation" part of repetitive tasks-- For example, when viewing aged checks for many communities, switching between them can be as simple as two clicks.

### Example Screenshots

![image](https://github.com/user-attachments/assets/3d3bb442-4fde-4980-8155-e4dd6c232895)

![image](https://github.com/user-attachments/assets/0b6d5344-7423-4cee-a5f5-7c4470dd1f3c)

(Your browser must be launched with `--remote-debugging-port=9222`)

## Business Principal Extractor

This app is designed to help with copying business principals from Utah's business-search into the below-app's required format.

**This app**:

- _Intakes:_ A click-drag copy-paste of the "Business Principals" table on the Utah Business Search website. (in `src/ioFiles/input.txt`)
- _Outputs:_ The list of business principals, formatted as below & with titles shortened. (into `src/ioFiles/output.txt`)

**Example Screenshots**

![image](https://github.com/user-attachments/assets/5be0f8c1-d24e-4250-a471-e93de877215c)
![image](https://github.com/user-attachments/assets/b57b57bb-3e9b-4bcd-9f14-0fba94ce968b)

**Execution**

- Set cwd: `cd ./src`
- Run app with `npm run ebp`
- Output will appear in `src/ioFiles/output.txt`

## Address Scraper

**This app**:

- _Intakes:_ A list of names.
- _Does:_ A property search for every person in each (supported) county, then intelligently narrows results to 1 county with 1 result per-person.
- _Outputs:_ Each person's name and address, formatted for paste into Excel.

**Example Screenshot**

![image](https://github.com/user-attachments/assets/9b96cd3c-7747-40da-9523-0a4993c91c96)

### Input Format

Valid Examples:

`Director John G Smith, Treasurer Timber M Monson, President George Washington`

`D John     Smith, T Timber Monson   , P George Washington `

- Titles required, but ignored.
- Names must be separated by commas.
- Middlenames optional, used in search when present.
- Extra spaces and duplicate names are ignored.

### Execution

- Set cwd: `cd ./src`
- In `src/ioFiles`, create an `input.txt` & put your list in it.
- Run app with `npm run addr`
- Output will appear in `src/ioFiles/output.txt`
- Pasting new namelists into `input.txt` will automatically trigger the app to run again.

### Extra Options

- `npm run addr json` Outputs a newline-less json blob of the results (with a bit more information)
- `num run addr both` Outputs both.

## Endato Searcher

**This app**:

- _Intakes:_ The Address Scraper's output. (Containing names and addresses)

- _Does:_ Requests to the Endato "Contact Enrich" API, using names/addresses to lookup contact info.

- _Outputs:_ Each person's name, latest address, latest phone #, and emails-- formatted for paste into Excel.

### Input Format

The input must be a json object, produced by the Address Scraper in `json` mode (see above).

### Example Screenshots

The console output is not human-readable for now, pending further work & dev stabilization.
![image](https://github.com/user-attachments/assets/0de5484b-27d1-41ab-89fc-1f7a65d6d6c8)

Excel paste:
A note is appended if the person's searched/latest addr differ.
![image](https://github.com/user-attachments/assets/4a71a58d-2356-44b4-b5fc-569f11f073e6)

To avoid wasting API requests, each one prompts for confirmation.
![image](https://github.com/user-attachments/assets/90271c04-212b-4554-b901-4753499a17a2)

### Execution

- Set cwd: `cd ./src`
- In `src/ioFiles`, create an `input.txt` & paste one `json` output of Address Scraper
- Run app with `npm run end`
- Output will appear in `src/ioFiles/output.txt`
- Pasting new `json`s into `input.txt` will automatically trigger the app to run again.
